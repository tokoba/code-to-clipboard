# Claude AI Development Notes

## Project Overview

Code to Clipboard is a VS Code extension that provides intelligent code copying with UTF-8 encoding detection and AI-powered related file discovery.

## Key Features Implemented

1. **Intelligent Encoding Detection**: Automatically detects and converts various encodings (Shift_JIS, EUC-JP, GB18030, Big5, etc.) to UTF-8
2. **AI-Powered Related File Discovery**: Uses LLM to analyze code and open related files (analyzes first 200 lines)
3. **Multi-language Support**: Handles international character sets and CJK languages

## Development Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run tests (if available)
npm run test

# Package extension
npm run package

# Package extension(visual studio installer format(.VSIX) for distribution)
npm run vsce:package
```

## Testing

- Press F5 in VS Code to launch Extension Development Host
- Test encoding detection with files containing Japanese, Chinese, Korean characters
- Test AI features by setting OPENAI_API_KEY environment variable

## Architecture

- Feature-based directory structure in `/src/features/`
- Encoding detection in `/src/features/common/encoding.ts`
- LLM integration in `/src/features/relatedFiles/openRelatedFiles.ts`
- Main entry point in `/src/extension.ts`

## Documentation

- Architecture details: `/docs/ARCHITECTURE.md`
- Development guide: `/docs/DEVELOPMENT.md`
- Updated README with new features

## Important File Locations

- Main extension: `src/extension.ts`
- Encoding detection: `src/features/common/encoding.ts`
- LLM integration: `src/features/relatedFiles/openRelatedFiles.ts`
- Clipboard operations: `src/features/clipboard/`

## Configuration (v0.5.2)

### LLM Provider Settings
- **Provider Selection**: `codeToClipboard.llm.provider` (openai, gemini, claude, local)
- **Fallback Providers**: `codeToClipboard.llm.fallbackProviders`
- **API Keys**: Environment variables or VS Code secret storage
  - OpenAI: `OPENAI_API_KEY`
  - Google: `GOOGLE_API_KEY` 
  - Anthropic: `ANTHROPIC_API_KEY`
- **Local LLM**: `codeToClipboard.llm.providers.local.endpoint`
- **File Filtering**: `codeToClipboard.excludePatterns`

### New Architecture Files (v0.5.2)
- LLM configuration types: `src/features/types/llmConfig.ts`
- Configuration manager: `src/features/llm/LLMConfigurationManager.ts`
- Provider implementations: `src/features/llm/providers/`
- Base provider class: `src/features/llm/base/BaseLLMProvider.ts`
