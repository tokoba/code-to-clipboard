# Code to Clipboard - Architecture Documentation

## Overview

Code to Clipboard is a VS Code extension that provides intelligent code copying and AI-powered file discovery capabilities. The extension is built with TypeScript and follows a feature-based architecture pattern.

## Project Structure

```text
src/
├── extension.ts                    # Main extension entry point
├── features/
│   ├── common/                     # Shared utilities
│   │   ├── encoding.ts            # UTF-8 encoding detection and conversion
│   │   ├── fileUtils.ts           # File type detection utilities
│   │   └── workspaceFiles.ts      # Workspace file listing with .gitignore support
│   ├── clipboard/                  # Clipboard operations
│   │   ├── copyAllTabs.ts         # Copy all open tabs
│   │   ├── copyCurrentTab.ts      # Copy current tab
│   │   ├── copyDirectoryCode.ts   # Copy directory with contents
│   │   ├── copyDirectoryTree.ts   # Copy directory structure only
│   │   └── copyOpenTabFileNames.ts # Copy tab filenames
│   ├── relatedFiles/              # AI-powered file discovery
│   │   └── openRelatedFiles.ts    # LLM-based related file detection
│   └── types/
│       └── index.ts               # TypeScript type definitions
```

## Core Features

### 1. Intelligent Encoding Detection (`src/features/common/encoding.ts`)

**Purpose**: Automatically detect and convert various text encodings to UTF-8 for consistent clipboard output.

**Key Components**:

- `detectAndDecodeFile(filePath: string): string | null`
- `normalizeEncoding(enc: string | undefined): string`
- `tryDecode(buffer: Buffer, enc: string, fatal = false): string | null`

**Detection Algorithm**:

1. **BOM Detection**: Check for UTF-8 BOM (`0xEF 0xBB 0xBF`)
2. **UTF-8 Validation**: Attempt strict UTF-8 decoding
3. **Character Detection**: Use `jschardet` library for encoding detection
4. **Priority Encoding List**: Try common encodings with quality validation
5. **Fallback**: Use `iso-8859-1` for maximum compatibility

**Supported Encodings**:

- Japanese: `shift_jis`, `euc-jp`
- Chinese: `gb18030`, `gbk`, `gb2312`, `big5`
- Korean: `euc-kr`
- Western: `iso-8859-1`, `windows-1250` through `windows-1258`

### 2. AI-Powered Related File Discovery (`src/features/relatedFiles/openRelatedFiles.ts`)

**Purpose**: Use LLM analysis to intelligently identify and open related files based on code structure and dependencies.

**Key Function**: `openRelatedFilesDepth1(resource: vscode.Uri)`

**Processing Pipeline**:

1. **File Reading**: Load starting file with encoding detection
2. **Content Trimming**: Extract first 200 lines for efficient LLM processing
3. **Workspace Discovery**: List all workspace files respecting `.gitignore`
4. **LLM Analysis**: Send code and file list to AI for related file identification
5. **File Opening**: Open identified related files in VS Code

**LLM Configuration**:

- **Primary Endpoint**: `http://localhost:5130/v1/chat/completions` (local LLM)
- **Fallback Endpoint**: `https://api.openai.com/v1/chat/completions` (OpenAI API)
- **Model**: `gpt-4o`
- **Temperature**: `0` (deterministic results)
- **Authentication**: Requires `OPENAI_API_KEY` environment variable

### 3. Clipboard Operations (`src/features/clipboard/`)

All clipboard operations use the encoding detection system to ensure UTF-8 output:

- **copyAllTabs.ts**: Copies all open tabs with encoding conversion
- **copyCurrentTab.ts**: Copies current tab with encoding detection
- **copyDirectoryCode.ts**: Copies directory contents with encoding normalization
- **copyDirectoryTree.ts**: Copies directory structure only
- **copyOpenTabFileNames.ts**: Lists open tab filenames

## Extension Lifecycle

### Activation (`src/extension.ts`)

The extension registers the following commands:

- `code-to-clipboard.copyCode` → Copy all tabs
- `code-to-clipboard.copyCurrentTabCode` → Copy current tab
- `code-to-clipboard.copyDirectoryCode` → Copy directory with contents
- `code-to-clipboard.copyDirectoryTree` → Copy directory structure
- `code-to-clipboard.openRelatedFilesDepth1` → AI-powered related file discovery
- `code-to-clipboard.copyOpenTabFileNames` → Copy tab filenames

### Context Menus

Commands are available in:

- Explorer context menu (for directories and files)
- Editor title context menu (for tabs)
- Editor context menu (right-click in editor)

## Dependencies

### Runtime Dependencies

- `iconv-lite`: Character encoding conversion
- `jschardet`: Character encoding detection
- `minimatch`: Glob pattern matching
- `fast-glob`: Fast file globbing
- `ignore`: .gitignore file parsing

### Development Dependencies

- `@types/vscode`: VS Code API types
- TypeScript compilation and build tools

## Configuration

### VS Code Settings

- `codeToClipboard.excludePatterns`: Glob patterns for files to exclude when copying directory code

### Environment Variables

- `OPENAI_API_KEY`: Required for AI-powered related file discovery

## Security Considerations

1. **API Key Management**: OpenAI API key is read from environment variables, never stored in code
2. **Local Processing**: Encoding detection and file operations are performed locally
3. **Content Filtering**: Only the first 200 lines of files are sent to LLM for analysis
4. **Workspace Isolation**: File operations respect workspace boundaries and `.gitignore` patterns

## Performance Optimizations

1. **Lazy Loading**: Features are loaded on-demand when commands are executed
2. **Content Limiting**: LLM analysis limited to 200 lines for efficient processing
3. **Encoding Caching**: Encoding detection results could be cached (future enhancement)
4. **Parallel Processing**: Multiple file operations can be performed concurrently

## Error Handling

1. **Encoding Fallback**: Graceful degradation when encoding detection fails
2. **API Fallback**: Support for both local and cloud LLM endpoints
3. **File Validation**: Checks for file existence before operations
4. **User Feedback**: Error messages displayed through VS Code notifications

## Future Enhancement Opportunities

1. **Configuration UI**: VS Code settings page for LLM endpoint configuration
2. **Encoding Cache**: Cache encoding detection results for better performance
3. **Custom Prompts**: Allow users to customize LLM prompts for file discovery
4. **Batch Operations**: Support for batch file processing
5. **Preview Mode**: Show preview before opening related files
