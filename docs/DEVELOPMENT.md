# Development Guide

## Development Setup

### Prerequisites

- Node.js 16+ and npm
- Visual Studio Code
- Git

### Installation

```bash
git clone <repository-url>
cd code-to-clipboard
npm install
```

### Development Workflow

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run tests
npm run test

# Package extension
npm run package
```

## Testing the Extension

### Local Testing

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Test commands in the new VS Code window

### AI Features Testing

Set up environment for LLM testing:

```bash
# For OpenAI API
export OPENAI_API_KEY="your-api-key"

# For local LLM (optional)
# Start local LLM server at http://localhost:5130
```

## Code Standards

### TypeScript Configuration

- Strict mode enabled
- ES2020 target
- Node.js module resolution

### File Organization

- Feature-based directory structure
- Shared utilities in `common/`
- Type definitions in `types/`

### Error Handling

- Always handle file I/O errors
- Provide user-friendly error messages
- Log detailed errors for debugging

## Adding New Features

### 1. Clipboard Operations

Create new file in `src/features/clipboard/`:

```typescript
import { detectAndDecodeFile } from '../common/encoding';

export async function newClipboardFeature() {
  // Use encoding detection for file operations
  const content = detectAndDecodeFile(filePath);
  // Process and copy to clipboard
}
```

### 2. File Utilities

Add utilities to `src/features/common/`:

```typescript
export function newUtility() {
  // Implement shared functionality
}
```

### 3. Command Registration

Add to `src/extension.ts`:

```typescript
const disposable = vscode.commands.registerCommand(
  'code-to-clipboard.newCommand',
  newFeatureFunction
);
context.subscriptions.push(disposable);
```

## Encoding Support

### Adding New Encodings

Modify `src/features/common/encoding.ts`:

```typescript
const ENCODING_PRIORITY = [
  'shift_jis', 'euc-jp',    // Japanese
  'gb18030', 'gbk', 'big5', // Chinese
  'euc-kr',                 // Korean
  'new-encoding',           // Add here
  // ... existing encodings
];
```

### Testing Encoding Detection

Create test files with different encodings:

```bash
# Create test files
echo "テスト" | iconv -f utf-8 -t shift_jis > test-sjis.txt
echo "测试" | iconv -f utf-8 -t gb18030 > test-gb.txt
```

## LLM Integration

### Local LLM Setup

For development with local LLM:

```bash
# Example with Ollama
ollama serve --port 5130
ollama run codellama:latest
```

### API Endpoint Configuration

Modify `src/features/relatedFiles/openRelatedFiles.ts`:

```typescript
const API_ENDPOINT = process.env.LLM_ENDPOINT || 
  'http://localhost:5130/v1/chat/completions';
```

### Prompt Engineering

Update LLM prompts for better results:

```typescript
const prompt = `
Analyze this code and suggest related files.
Consider imports, exports, and dependencies.
Current file: ${startFilePath}
Workspace files: ${availableFiles.join(', ')}

Code (first 200 lines):
${startFileContent}

Return only file paths, one per line.
`;
```

## Testing Strategies

### Unit Tests

```typescript
// Test encoding detection
import { detectAndDecodeFile } from './encoding';

describe('Encoding Detection', () => {
  test('should detect UTF-8 BOM', () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
// Test full workflow
describe('Related Files Feature', () => {
  test('should open related files', async () => {
    // Mock LLM response
    // Test file opening
  });
});
```

### Manual Testing Checklist

- [ ] Copy single file with various encodings
- [ ] Copy multiple tabs with mixed encodings
- [ ] Copy directory with .gitignore respect
- [ ] Open related files with LLM
- [ ] Test with no API key
- [ ] Test with invalid file paths

## Performance Considerations

### File Size Limits

- LLM analysis limited to 200 lines
- Large directories may cause timeouts
- Consider implementing progress indicators

### Memory Usage

- Avoid loading entire large files
- Stream file operations when possible
- Clean up temporary resources

### API Rate Limiting

- Implement exponential backoff
- Cache LLM responses when appropriate
- Provide feedback for long operations

## Debugging

### VS Code Debug Configuration

`.vscode/launch.json`:

```json
{
  "type": "extensionHost",
  "request": "launch",
  "name": "Launch Extension",
  "runtimeExecutable": "${execPath}",
  "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
  "stopOnEntry": false
}
```

### Logging

Add debug logging:

```typescript
import * as vscode from 'vscode';

const outputChannel = vscode.window.createOutputChannel('Code to Clipboard');

function log(message: string) {
  outputChannel.appendLine(`[${new Date().toISOString()}] ${message}`);
}
```

### Common Issues

1. **Encoding Detection Fails**: Check file BOM and character distribution
2. **LLM API Errors**: Verify API key and endpoint configuration
3. **File Not Found**: Ensure file paths are absolute and valid
4. **Permission Errors**: Check file system permissions

## Deployment

### Extension Packaging

```bash
# Install vsce
npm install -g vsce

# Package extension
vsce package

# Publish to marketplace (if configured)
vsce publish
```

### Version Management

Update `package.json`:

```json
{
  "version": "1.0.0",
  "engines": {
    "vscode": "^1.60.0"
  }
}
```

## Contributing Guidelines

### Pull Request Process

1. Create feature branch from main
2. Implement changes with tests
3. Update documentation
4. Submit PR with description

### Code Review Checklist

- [ ] TypeScript compilation passes
- [ ] Tests pass
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] Encoding detection works
- [ ] LLM integration tested
