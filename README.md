# Code to Clipboard

<img src="https://raw.githubusercontent.com/nakamurau1/code-to-clipboard/main/images/icon.webp" alt="icon" width=200>

## important notes

This repository is a fork of [code-to-clipboard](https://github.com/nakamurau1/code-to-clipboard).
We want to make it compatible with multi-byte character sets used by CJK languages. (China, Japan, Korea, etc)
Gradually we redefined the clipboard functionality based on users' feedbacks.
We appreciate the effort of the original authors([nakamurau1](https://github.com/nakamurau1)) and contributers.

We are still under development of some functionalities.
If you have any issues or suggestions, please feel to reach out via [Pull Requests](https://github.com/tokoba/code-to-clipboard/pulls).

## overview

Code to Clipboard is a Visual Studio Code extension designed to make it easy to share code with AI systems like ChatGPT and Claude3. It allows you to quickly copy code from your workspace to the clipboard in a format that provides context and clarity to the AI models.

**Key Features:**

- **Intelligent Encoding Detection**: Automatically detects and converts various text encodings (Shift_JIS, EUC-JP, GB18030, Big5, etc.) to UTF-8 for consistent clipboard output
- **AI-Powered Related File Discovery**: Uses LLM to intelligently identify and open related files based on code analysis
- **Multi-language Support**: Handles international character sets and CJK languages seamlessly

## Features

- **Copy code from a single file to the clipboard** with automatic encoding detection and UTF-8 conversion
- **Copy code from the current text file tab to the clipboard** with intelligent character encoding handling
- **Copy code from all open text file tabs to the clipboard** - automatically converts different encodings to UTF-8 for consistent output
- **Copy code from a selected directory to the clipboard**, including the directory structure with encoding normalization
- **Copy only the directory structure** of a selected directory without file contents
- **Respects `.gitignore` files** and excludes ignored files from the copied code
- **Outputs the copied code in a well-structured format** with headers for easy readability
- **AI-Powered Related File Discovery**: Automatically open files that are directly related to the current file using LLM analysis
  - Analyzes the first 200 lines of the current file for efficient processing
  - Uses OpenAI API to intelligently determine related files based on code dependencies and references
  - Supports both local LLM endpoints and OpenAI API
  - Respects workspace structure and `.gitignore` patterns

## Usage

### Copy Code from Current Tab

1. Open a text file in the editor.
2. Right-click on the editor or the tab title.
3. Select "Copy Code from Current Tab to Clipboard" from the context menu.
4. The code from the current text file tab will be copied to the clipboard.

### Copy Code from All Open Tabs

1. Right-click on any text file tab or in the editor.
2. Select "Copy Code from All Open Tabs to Clipboard" from the context menu.
3. The code from all open text file tabs will be copied to the clipboard.

### Copy Code from a Directory

1. Right-click on a directory in the explorer.
2. Select "Copy Directory Code to Clipboard" from the context menu.
3. The code from all text files in the selected directory and its subdirectories will be copied to the clipboard, along with the directory structure.
4. Files specified in `.gitignore` files will be excluded from the copied code.
5. Files matching the user-specified exclude patterns will be excluded from the copied code.

### Copy Directory Tree

1. Right-click on a directory in the explorer.
2. Select "Copy Directory Tree to Clipboard" from the context menu.
3. The directory structure of the selected directory will be copied to the clipboard without file contents.

### Open Related Files (AI-Powered)

1. Right-click on a file in the explorer or have the file open in the editor.
2. Select "Open Related Files" from the context menu.
3. The extension will:
   - Read the first 200 lines of the current file for efficient LLM processing
   - Analyze the code structure and dependencies using AI
   - Query the OpenAI API (or local LLM endpoint) to identify related files
   - Automatically open all related files that exist in your project
4. **Configuration**: Set the `OPENAI_API_KEY` environment variable to use OpenAI API, or configure a local LLM endpoint
5. **Supported Encodings**: Works with files in various encodings (Shift_JIS, EUC-JP, GB18030, Big5, etc.) - all converted to UTF-8 for analysis

## Clipboard Format

### For Code and Directory Structure

The code is copied to the clipboard in the following format:

````md
# Project Name

## Copied Files

  - file1.js
  - file2.ts
  - dir1/file3.js
  - dir1/file4.ts

## File Contents

### file1.js

```js
// file1.js content
```

### file2.ts

```ts
// file2.ts content
```

### dir1/file3.js

```js
// dir1/file3.js content
```

### dir1/file4.ts

```ts
// dir1/file4.ts content
```
````

### For Directory Tree Only

When copying a directory tree, the format is:

```md
# Directory Name

## Directory Structure

- Directory Name/
  - subdirectory1/
    - file1.js
  - subdirectory2/
    - file2.ts
  - file3.md
```

This format provides a clear and readable structure for the copied code, with the project or directory name at the top, followed by the list of copied files or directory structure, and then the contents of each file.

## Extension Settings

This extension contributes the following settings:

- `codeToClipboard.excludePatterns`: Glob patterns for files to exclude when copying directory code. Default is `["*.lock", "yarn.lock", "package-lock.json", "pnpm-lock.yaml", "composer.lock"]`.

To specify exclude patterns, add them to your VS Code settings:

```json
{
    "codeToClipboard.excludePatterns": ["*.lock", "*.log", "node_modules/"]
}
```

## Requirements

- Visual Studio Code 1.60.0 or higher
- **For AI-Powered Related File Discovery**:
  - OpenAI API key (set as `OPENAI_API_KEY` environment variable) OR
  - Local LLM endpoint compatible with OpenAI API format (default: `http://localhost:5130/v1/chat/completions`)

## Technical Features

### Intelligent Encoding Detection and Conversion

The extension automatically handles various text encodings commonly used in international development:

- **BOM Detection**: Automatically detects UTF-8 BOM markers
- **Multi-language Support**:
  - Japanese: Shift_JIS, EUC-JP
  - Chinese: GB18030, GBK, GB2312, Big5
  - Korean: EUC-KR
  - Western European: ISO-8859-1, Windows-1250-1258
- **Quality Validation**: Rejects text with replacement characters or invalid control sequences
- **Fallback Strategy**: Graceful degradation to ensure content is always readable

All copied content is normalized to UTF-8 for consistent clipboard output, ensuring compatibility with AI systems and international character sets.

### AI-Powered File Discovery

The related file discovery feature uses advanced LLM analysis:

- **Efficient Processing**: Analyzes only the first 200 lines of files for optimal performance
- **Context-Aware**: Understands code structure, imports, and dependencies
- **Workspace Integration**: Respects `.gitignore` patterns and excludes build directories
- **Flexible Configuration**: Supports both cloud and local LLM endpoints

## Known Issues

None

---

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue on the [GitHub repository](https://github.com/tokoba/code-to-clipboard).

## License

This extension is licensed under the [MIT License](LICENSE).
