import * as fs from "node:fs";
import * as jschardet from "jschardet";
import iconv from "iconv-lite";
import { outputChannel } from "./logger";

// 汎用候補エンコーディング（優先度を中国語系→日本語系の順に調整）
const COMMON_ENCODINGS = [
	"shift_jis",
	"euc-jp", // ← 日本語系を先に
	"gb18030",
	"gbk",
	"gb2312",
	"big5", // ← 中国語系
	"euc-kr", // ← 韓国語系
	"iso-8859-1",
	"windows-1250",
	"windows-1251",
	"windows-1252",
	"windows-1253",
	"windows-1254",
	"windows-1255",
	"windows-1256",
	"windows-1257",
	"windows-1258",
];

// � (U+FFFD) が含まれる＝化けていると判断
function hasReplacementChar(text: string): boolean {
	return text.includes("\uFFFD");
}

// C1 制御文字 (U+0080–U+009F) を含むか
function hasC1Controls(text: string): boolean {
	return /[\u0080-\u009F]/.test(text);
}

// CJK/Hiragana/Katakana/Hangul のいずれかを含むか
function hasCJKChars(text: string): boolean {
	return /[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(text);
}

// ひらがな・カタカナを含むか（日本語判定に使用）
function hasKana(text: string): boolean {
	return /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
}

// iconv → TextDecoder の順に試す共通デコード関数
function tryDecode(buffer: Buffer, enc: string, fatal = false): string | null {
	try {
		// iconv-lite is more lenient and supports more legacy encodings
		if (enc !== "utf-8" && enc !== "utf-16le") {
			return iconv.decode(buffer, enc);
		}
	} catch {
		/* fall-through */
	}
	try {
		// TextDecoder is stricter, especially with `fatal: true`
		return new TextDecoder(enc, { fatal }).decode(buffer);
	} catch {
		return null;
	}
}

function normalizeEncoding(enc: string | undefined): string {
	if (!enc) return "utf-8";

	// 前後空白除去＋小文字化
	let e = enc.trim().toLowerCase();

	// 共通的な揺らぎを統一
	e = e.replace(/[ _\s]+/g, "-"); // "_" や空白 → "-"
	if (e === "utf8") e = "utf-8";
	if (e === "utf16" || e === "utf-16") e = "utf-16le";

	// 代表的エイリアスマップ（JIS/簡体/ハングル以外も網羅）
	const map: Record<string, string> = {
		/* --- Japanese / Chinese / Korean ---------------------------- */
		"shift-jis": "shift_jis",
		sjis: "shift_jis",
		ms932: "shift_jis",
		cp932: "shift_jis",
		eucjp: "euc-jp",
		euckr: "euc-kr",
		euc_kr: "euc-kr",
		"ks_c_5601-1987": "euc-kr",
		"iso-2022-kr": "euc-kr",
		gb2312: "gbk",
		gb_2312: "gbk",
		gbk: "gbk",
		gb18030: "gb18030",
		big5hkscs: "big5",
		"big5-hkscs": "big5",
		"cn-big5": "big5",

		/* --- Western European -------------------------------------- */
		latin1: "iso-8859-1",
		"iso8859-1": "iso-8859-1",
		"windows-1252": "iso-8859-1",
		win1252: "iso-8859-1",
		cp1252: "iso-8859-1",

		/* --- Central European -------------------------------------- */
		latin2: "windows-1250",
		"iso8859-2": "windows-1250",
		"iso-8859-2": "windows-1250",
		"windows-1250": "windows-1250",
		win1250: "windows-1250",
		cp1250: "windows-1250",

		/* --- Turkish ----------------------------------------------- */
		latin5: "windows-1254",
		"iso8859-9": "windows-1254",
		"iso-8859-9": "windows-1254",
		"windows-1254": "windows-1254",
		win1254: "windows-1254",
		cp1254: "windows-1254",

		/* --- Cyrillic ---------------------------------------------- */
		cyrillic: "windows-1251",
		"iso8859-5": "windows-1251",
		"iso-8859-5": "windows-1251",
		"windows-1251": "windows-1251",
		win1251: "windows-1251",
		cp1251: "windows-1251",
		koi8r: "koi8-r",
		"koi8-r": "koi8-r",
		koi8u: "koi8-u",
		"koi8-u": "koi8-u",

		/* --- Greek -------------------------------------------------- */
		"iso8859-7": "windows-1253",
		"iso-8859-7": "windows-1253",
		"windows-1253": "windows-1253",
		win1253: "windows-1253",
		cp1253: "windows-1253",

		/* --- Arabic ------------------------------------------------- */
		"iso8859-6": "windows-1256",
		"iso-8859-6": "windows-1256",
		"windows-1256": "windows-1256",
		win1256: "windows-1256",
		cp1256: "windows-1256",

		/* --- Hebrew ------------------------------------------------- */
		"iso8859-8": "windows-1255",
		"iso-8859-8": "windows-1255",
		"windows-1255": "windows-1255",
		win1255: "windows-1255",
		cp1255: "windows-1255",

		/* --- Baltic ------------------------------------------------- */
		latin4: "windows-1257",
		"iso8859-4": "windows-1257",
		"iso-8859-4": "windows-1257",
		"iso8859-13": "windows-1257",
		"iso-8859-13": "windows-1257",
		"windows-1257": "windows-1257",
		win1257: "windows-1257",
		cp1257: "windows-1257",

		/* --- Thai --------------------------------------------------- */
		"iso8859-11": "windows-874",
		"iso-8859-11": "windows-874",
		"windows-874": "windows-874",
		win874: "windows-874",
		cp874: "windows-874",
		"tis-620": "windows-874",

		/* --- Vietnamese -------------------------------------------- */
		"windows-1258": "windows-1258",
		win1258: "windows-1258",
		cp1258: "windows-1258",

		/* --- Western Extended -------------------------------------- */
		"iso8859-15": "iso-8859-15",
		"iso-8859-15": "iso-8859-15",
		latin9: "iso-8859-15",

		/* --- Mac ---------------------------------------------------- */
		mac: "macroman",
		macintosh: "macroman",
		macroman: "macroman",

		/* --- Windows specific encodings (追加エイリアス・重複排除) -- */
		"windows-31j": "shift_jis",
		"874": "windows-874",
		"1250": "windows-1250",
		"1251": "windows-1251",
		"1252": "iso-8859-1",
		"1253": "windows-1253",
		"1254": "windows-1254",
		"1255": "windows-1255",
		"1256": "windows-1256",
		"1257": "windows-1257",
		"1258": "windows-1258",
	};
	return map[e] ?? e;
}

export function detectAndDecodeFile(filePath: string): string | null {
	try {
		const buffer = fs.readFileSync(filePath);

		// 1. Check for UTF-8 BOM
		if (
			buffer.length >= 3 &&
			buffer[0] === 0xef &&
			buffer[1] === 0xbb &&
			buffer[2] === 0xbf
		) {
			const decoded = tryDecode(buffer, "utf-8");
			if (decoded !== null) {
				outputChannel.appendLine(`[OK]  ${filePath}  ->  utf-8 (BOM)`);
				return decoded;
			}
		}

		// 2. Try decoding as UTF-8 (without BOM)
		// Use fatal: true to ensure that invalid byte sequences throw an error.
		const utf8Decoded = tryDecode(buffer, "utf-8", true);
		if (utf8Decoded !== null) {
			outputChannel.appendLine(`[OK]  ${filePath}  ->  utf-8 (Valid)`);
			return utf8Decoded;
		}

		// 3. If UTF-8 fails, proceed with jschardet and other encodings
		const detectedEnc = normalizeEncoding(jschardet.detect(buffer)?.encoding);

		const tried: string[] = [];
		const tryList = [
			detectedEnc,
			...COMMON_ENCODINGS.filter((e) => e !== detectedEnc && e !== "utf-8"),
		];

		for (const enc of tryList) {
			if (!enc) continue;
			tried.push(enc);
			const decoded = tryDecode(buffer, enc);
			if (!decoded) continue;

			if (hasReplacementChar(decoded) || hasC1Controls(decoded)) {
				continue;
			}

			if (hasCJKChars(decoded)) {
				if ((enc === "shift_jis" || enc === "euc-jp") && !hasKana(decoded)) {
					continue;
				}
				outputChannel.appendLine(`[OK]  ${filePath}  ->  ${enc} (CJK hit)`);
				return decoded;
			}
		}

		// 4. As a last resort, try a lenient ISO-8859-1 decode
		const lastResort = tryDecode(buffer, "iso-8859-1");
		if (lastResort) {
			outputChannel.appendLine(
				`[OK]  ${filePath}  ->  iso-8859-1 (Last resort)`,
			);
			return lastResort;
		}

		outputChannel.appendLine(`[NG]  ${filePath}  (tried: ${tried.join(", ")})`);
		return null;
	} catch (error) {
		outputChannel.appendLine(`[ERR] ${filePath}  ${String(error)}`);
		return null;
	}
}
