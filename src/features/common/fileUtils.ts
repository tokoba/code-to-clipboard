import * as fs from "node:fs";
import * as path from "node:path";

export function isTextFile(filePath: string): boolean {
	try {
		if (path.extname(filePath) === ".svg") {
			return false;
		}

		const buffer = fs.readFileSync(filePath);
		const size = buffer.length;

		if (size === 0) {
			return true;
		}

		const chunk = buffer.subarray(0, size);

		// Check for BOM
		if (
			size >= 3 &&
			chunk[0] === 0xef &&
			chunk[1] === 0xbb &&
			chunk[2] === 0xbf
		) {
			return true;
		}

		// Check for text characters
		for (let i = 0; i < chunk.length; i++) {
			const charCode = chunk[i];
			if (charCode === 0) {
				return false;
			}
			if (
				charCode < 7 ||
				(charCode >= 14 && charCode < 32 && charCode !== 27)
			) {
				return false;
			}
		}

		return true;
	} catch (_error) {
		return false;
	}
}
