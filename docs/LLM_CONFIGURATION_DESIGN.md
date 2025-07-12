# LLM Configuration Design - Version 0.5.2

## Overview

This document describes the design for a flexible LLM provider configuration system that supports multiple AI services including OpenAI, Google Gemini, Anthropic Claude, and local LLM endpoints.

## Current Issues (v0.5.1)

1. **Hardcoded Endpoints**: LLM endpoints are hardcoded in source code
2. **Limited Provider Support**: Only OpenAI format is supported
3. **No User Configuration**: Users cannot choose their preferred LLM provider
4. **Environment Variable Dependency**: Only supports API keys via environment variables

## Design Goals (v0.5.2)

1. **Multiple Provider Support**: Support for OpenAI, Google Gemini, Anthropic Claude, and local LLMs
2. **User-Configurable**: VS Code settings-based configuration
3. **Workspace-Specific Settings**: Support both global and workspace-specific configurations
4. **Secure Credential Management**: Support for both environment variables and VS Code secret storage
5. **Fallback Mechanisms**: Graceful fallback between providers
6. **Extensible Architecture**: Easy to add new LLM providers

## Configuration Schema

### VS Code Settings

```json
{
  "codeToClipboard.llm": {
    "provider": "openai",
    "providers": {
      "openai": {
        "endpoint": "https://api.openai.com/v1/chat/completions",
        "model": "gpt-4o",
        "apiKeySource": "environment",
        "apiKeyEnvVar": "OPENAI_API_KEY",
        "temperature": 0,
        "maxTokens": 4096
      },
      "gemini": {
        "endpoint": "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
        "model": "gemini-pro",
        "apiKeySource": "environment",
        "apiKeyEnvVar": "GOOGLE_API_KEY",
        "temperature": 0,
        "maxTokens": 4096
      },
      "claude": {
        "endpoint": "https://api.anthropic.com/v1/messages",
        "model": "claude-3-sonnet-20240229",
        "apiKeySource": "environment",
        "apiKeyEnvVar": "ANTHROPIC_API_KEY",
        "temperature": 0,
        "maxTokens": 4096
      },
      "local": {
        "endpoint": "http://localhost:5130/v1/chat/completions",
        "model": "codellama:latest",
        "apiKeySource": "none",
        "temperature": 0,
        "maxTokens": 4096
      }
    },
    "fallbackProviders": ["openai", "local"],
    "timeout": 30000,
    "retryAttempts": 2
  }
}
```

### Configuration Types

```typescript
interface LLMConfiguration {
  provider: string;
  providers: Record<string, ProviderConfig>;
  fallbackProviders: string[];
  timeout: number;
  retryAttempts: number;
}

interface ProviderConfig {
  endpoint: string;
  model: string;
  apiKeySource: 'environment' | 'vscode-secrets' | 'none';
  apiKeyEnvVar?: string;
  apiKeySecret?: string;
  temperature: number;
  maxTokens: number;
  customHeaders?: Record<string, string>;
}
```

## Provider Abstractions

### Base Provider Interface

```typescript
interface LLMProvider {
  name: string;
  isConfigured(): Promise<boolean>;
  validateConfiguration(): Promise<ValidationResult>;
  sendRequest(prompt: string, options?: RequestOptions): Promise<LLMResponse>;
}

interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  provider: string;
  model: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Provider Implementations

#### OpenAI Provider
```typescript
class OpenAIProvider implements LLMProvider {
  name = 'openai';
  
  async sendRequest(prompt: string): Promise<LLMResponse> {
    // OpenAI Chat Completions API implementation
  }
}
```

#### Google Gemini Provider
```typescript
class GeminiProvider implements LLMProvider {
  name = 'gemini';
  
  async sendRequest(prompt: string): Promise<LLMResponse> {
    // Google Gemini API implementation
    // Transform request/response format as needed
  }
}
```

#### Anthropic Claude Provider
```typescript
class ClaudeProvider implements LLMProvider {
  name = 'claude';
  
  async sendRequest(prompt: string): Promise<LLMResponse> {
    // Anthropic Messages API implementation
    // Transform request/response format as needed
  }
}
```

#### Local LLM Provider
```typescript
class LocalLLMProvider implements LLMProvider {
  name = 'local';
  
  async sendRequest(prompt: string): Promise<LLMResponse> {
    // OpenAI-compatible local endpoint implementation
  }
}
```

## Configuration Management

### LLM Configuration Manager

```typescript
class LLMConfigurationManager {
  private config: LLMConfiguration;
  private providers: Map<string, LLMProvider>;
  
  constructor() {
    this.loadConfiguration();
    this.initializeProviders();
  }
  
  private loadConfiguration(): void {
    // Load from VS Code settings with workspace override support
    const globalConfig = vscode.workspace.getConfiguration('codeToClipboard.llm');
    const workspaceConfig = vscode.workspace.getConfiguration('codeToClipboard.llm', 
      vscode.workspace.workspaceFolders?.[0]);
    
    // Merge configurations with workspace taking precedence
    this.config = this.mergeConfigurations(globalConfig, workspaceConfig);
  }
  
  async getActiveProvider(): Promise<LLMProvider> {
    const primaryProvider = this.providers.get(this.config.provider);
    
    if (primaryProvider && await primaryProvider.isConfigured()) {
      return primaryProvider;
    }
    
    // Try fallback providers
    for (const fallbackName of this.config.fallbackProviders) {
      const fallbackProvider = this.providers.get(fallbackName);
      if (fallbackProvider && await fallbackProvider.isConfigured()) {
        return fallbackProvider;
      }
    }
    
    throw new Error('No configured LLM provider available');
  }
  
  async sendRequest(prompt: string): Promise<LLMResponse> {
    const provider = await this.getActiveProvider();
    return this.withRetry(() => provider.sendRequest(prompt));
  }
}
```

## Security Considerations

### API Key Management

1. **Environment Variables**: Default and most secure method
2. **VS Code Secret Storage**: Encrypted storage for per-workspace keys
3. **Configuration Validation**: Prevent accidental key exposure in settings

```typescript
class SecureCredentialManager {
  constructor(private context: vscode.ExtensionContext) {}
  
  async getApiKey(provider: string, config: ProviderConfig): Promise<string | undefined> {
    switch (config.apiKeySource) {
      case 'environment':
        return process.env[config.apiKeyEnvVar || ''];
      
      case 'vscode-secrets':
        const secretKey = config.apiKeySecret || `llm.${provider}.apiKey`;
        return await this.context.secrets.get(secretKey);
      
      case 'none':
        return undefined;
    }
  }
  
  async setApiKey(provider: string, key: string): Promise<void> {
    const secretKey = `llm.${provider}.apiKey`;
    await this.context.secrets.store(secretKey, key);
  }
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. Create provider abstraction interfaces
2. Implement configuration management system
3. Add VS Code settings schema to package.json
4. Create secure credential manager

### Phase 2: Provider Implementation
1. Implement OpenAI provider (refactor existing code)
2. Add Google Gemini provider
3. Add Anthropic Claude provider
4. Add local LLM provider support

### Phase 3: User Experience
1. Add configuration validation and error reporting
2. Implement fallback mechanisms
3. Add provider status indicators
4. Create configuration UI commands

### Phase 4: Advanced Features
1. Provider performance monitoring
2. Usage analytics and token counting
3. Custom prompt templates per provider
4. Batch request optimization

## Package.json Configuration Schema

```json
{
  "contributes": {
    "configuration": {
      "title": "Code to Clipboard LLM Settings",
      "properties": {
        "codeToClipboard.llm.provider": {
          "type": "string",
          "default": "openai",
          "enum": ["openai", "gemini", "claude", "local"],
          "description": "Primary LLM provider to use"
        },
        "codeToClipboard.llm.providers.openai.endpoint": {
          "type": "string",
          "default": "https://api.openai.com/v1/chat/completions",
          "description": "OpenAI API endpoint"
        },
        "codeToClipboard.llm.providers.openai.model": {
          "type": "string",
          "default": "gpt-4o",
          "description": "OpenAI model to use"
        },
        "codeToClipboard.llm.providers.gemini.endpoint": {
          "type": "string",
          "default": "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
          "description": "Google Gemini API endpoint"
        },
        "codeToClipboard.llm.fallbackProviders": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["openai", "gemini", "claude", "local"]
          },
          "default": ["openai", "local"],
          "description": "Fallback providers in order of preference"
        }
      }
    }
  }
}
```

## Workspace-Specific Configuration Examples

### Global Settings (User Settings)
```json
{
  "codeToClipboard.llm.provider": "openai",
  "codeToClipboard.llm.providers.openai.model": "gpt-4o"
}
```

### Workspace Settings (.vscode/settings.json)
```json
{
  "codeToClipboard.llm.provider": "local",
  "codeToClipboard.llm.providers.local.endpoint": "http://localhost:11434/v1/chat/completions",
  "codeToClipboard.llm.providers.local.model": "codellama:13b"
}
```

## Migration Strategy

### Version 0.5.1 → 0.5.2
1. **Backward Compatibility**: Existing OPENAI_API_KEY environment variable continues to work
2. **Automatic Migration**: Detect existing configuration and create appropriate settings
3. **Deprecation Warnings**: Inform users about new configuration options
4. **Documentation Updates**: Update README and docs with new configuration examples

## Error Handling and User Feedback

### Configuration Validation
```typescript
async function validateConfiguration(): Promise<void> {
  const manager = new LLMConfigurationManager();
  const results = await manager.validateAllProviders();
  
  const errors = results.filter(r => !r.isValid);
  if (errors.length > 0) {
    const message = `LLM Configuration Issues:\n${errors.map(e => e.errors.join(', ')).join('\n')}`;
    vscode.window.showWarningMessage(message, 'Open Settings').then(selection => {
      if (selection === 'Open Settings') {
        vscode.commands.executeCommand('workbench.action.openSettings', 'codeToClipboard.llm');
      }
    });
  }
}
```

### Provider Status Indicators
- Status bar indicator showing active provider
- Error notifications with actionable suggestions
- Configuration health checks on extension activation

## Future Enhancements

1. **Provider Marketplace**: Allow third-party provider plugins
2. **Custom Prompts**: Provider-specific prompt optimization
3. **Usage Analytics**: Token usage tracking and cost estimation
4. **Streaming Responses**: Support for streaming LLM responses
5. **Multi-Model Ensemble**: Combine multiple providers for better results