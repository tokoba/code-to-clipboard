# 変更点

## 文字コード処理

Before
処理方法: UTF-8指定でファイル読み出し
問題点: Shift_JISやGB2312(簡体中国語文字)などのファイルがタブごとに混在していた場合，コードはASCIIなので文字化けしないがコメント等が文字化けする。

After
処理方法: ファイル読み出し後にデコードし文字種推定，UTF-8でなければエンコード変換
テスト: Shift_JIS, GB2312(簡体中国語), EUC-KR(ハングル)などの異なる文字コードのファイルを開いた状態で"Copy Code from All Open Tabs to the clipboard"をすると以下のように事前にUTF-8にエンコードされた上でクリップボードに格納されるので，文字化けしない。

## 拡張子の付与

ファイル名から".ts", ".js", "rs", ".py"など拡張子を取得し，コードブロックの中身のプログラミング言語の種類を表すようにした。これにより正しくsyntax highlightされやすくなる。 <https://www.markdownguide.org/extended-syntax/#syntax-highlighting>

````md
# code-to-clipboard

## Copied Files

  - temp/utf-8.py
  - temp/china.md
  - temp/ja.md
  - temp/korea.md

## File Contents

### temp/utf-8.py

```py
# -*- coding: utf-8 -*-

def greet(name):
    """
    This function greets the given name.
    これはUTF-8でエンコードされた日本語のコメントです。
    """
    print(f"Hello, {name}!")
    print("Pythonのサンプルコードです。")

if __name__ == "__main__":
    greet("World")

```

### temp/china.md

```md
你好
最近怎么样？

```

### temp/ja.md

```md
こんにちは
日本語のShift_JISで保存された文章です。

```

### temp/korea.md

```md
안녕하세요

```

````

## log

gbk, euc-kr, shift_jis, utf-8など4種類の異なる文字コードのファイルをUTF-8に統一した上でクリップボードにコピーできている。以下のデバッグログは確認用としてコンソールに出力したもの。

debug log
```log
CodeToClipboard extension activated
[OK]  c:\Drive\TS\code-to-clipboard\temp\china.md  ->  gbk (CJK hit)
[DEBUG] File: c:\Drive\TS\code-to-clipboard\temp\china.md, Extension: md
[OK]  c:\Drive\TS\code-to-clipboard\temp\korea.md  ->  euc-kr (CJK hit)
[DEBUG] File: c:\Drive\TS\code-to-clipboard\temp\korea.md, Extension: md
[OK]  c:\Drive\TS\code-to-clipboard\temp\ja.md  ->  shift_jis (CJK hit)
[DEBUG] File: c:\Drive\TS\code-to-clipboard\temp\ja.md, Extension: md
[OK]  c:\Drive\TS\code-to-clipboard\src\extension.ts  ->  utf-8 (Valid)
[DEBUG] File: c:\Drive\TS\code-to-clipboard\src\extension.ts, Extension: ts
```
