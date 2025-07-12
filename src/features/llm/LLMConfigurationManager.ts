import * as vscode from 'vscode';
import type { 
  LLMConfiguration, 
  LLMProvider, 
  LLMResponse, 
  ValidationResult,
  LLMProviderType
} from '../types/llmConfig';
import { DEFAULT_LLM_CONFIG } from '../types/llmConfig';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { ClaudeProvider } from './providers/ClaudeProvider';
import { LocalLLMProvider } from './providers/LocalLLMProvider';

export class LLMConfigurationManager {
  private config: LLMConfiguration;
  private providers: Map<string, LLMProvider>;

  constructor(private context: vscode.ExtensionContext) {
    this.config = this.loadConfiguration();
    this.providers = new Map();
    this.initializeProviders();
  }

  private loadConfiguration(): LLMConfiguration {
    const globalConfig = vscode.workspace.getConfiguration('codeToClipboard');
    
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const workspaceConfig = workspaceFolder 
      ? vscode.workspace.getConfiguration('codeToClipboard', workspaceFolder)
      : undefined;

    const provider = workspaceConfig?.get('llm.provider') ?? globalConfig.get('llm.provider') ?? DEFAULT_LLM_CONFIG.provider;
    
    // Debug logging
    console.log('LLM Configuration Debug:');
    console.log('  Selected provider:', provider);
    console.log('  Global config llm.provider:', globalConfig.get('llm.provider'));
    console.log('  Workspace config llm.provider:', workspaceConfig?.get('llm.provider'));

    const config: LLMConfiguration = {
      provider: provider as string,
      providers: this.mergeProviderConfigs(globalConfig, workspaceConfig),
      fallbackProviders: workspaceConfig?.get('llm.fallbackProviders') ?? globalConfig.get('llm.fallbackProviders') ?? DEFAULT_LLM_CONFIG.fallbackProviders,
      timeout: workspaceConfig?.get('llm.timeout') ?? globalConfig.get('llm.timeout') ?? DEFAULT_LLM_CONFIG.timeout,
      retryAttempts: workspaceConfig?.get('llm.retryAttempts') ?? globalConfig.get('llm.retryAttempts') ?? DEFAULT_LLM_CONFIG.retryAttempts
    };

    console.log('  Final config provider:', config.provider);
    console.log('  Local provider config:', config.providers.local);

    return config;
  }

  private mergeProviderConfigs(
    globalConfig: vscode.WorkspaceConfiguration,
    workspaceConfig?: vscode.WorkspaceConfiguration
  ) {
    const mergedProviders = { ...DEFAULT_LLM_CONFIG.providers };

    for (const [providerName, defaultConfig] of Object.entries(DEFAULT_LLM_CONFIG.providers)) {
      const globalProviderConfig = globalConfig.get(`llm.providers.${providerName}`) as any;
      const workspaceProviderConfig = workspaceConfig?.get(`llm.providers.${providerName}`) as any;

      mergedProviders[providerName] = {
        ...defaultConfig,
        ...globalProviderConfig,
        ...workspaceProviderConfig
      };
    }

    return mergedProviders;
  }

  private initializeProviders(): void {
    this.providers.clear();

    for (const [providerName, providerConfig] of Object.entries(this.config.providers)) {
      let provider: LLMProvider;

      switch (providerName) {
        case 'openai':
          provider = new OpenAIProvider(providerConfig, this.context);
          break;
        case 'gemini':
          provider = new GeminiProvider(providerConfig, this.context);
          break;
        case 'claude':
          provider = new ClaudeProvider(providerConfig, this.context);
          break;
        case 'local':
          provider = new LocalLLMProvider(providerConfig, this.context);
          break;
        default:
          continue;
      }

      this.providers.set(providerName, provider);
    }
  }

  async getActiveProvider(): Promise<LLMProvider> {
    const primaryProvider = this.providers.get(this.config.provider);
    
    if (primaryProvider && await primaryProvider.isConfigured()) {
      return primaryProvider;
    }

    for (const fallbackName of this.config.fallbackProviders) {
      const fallbackProvider = this.providers.get(fallbackName);
      if (fallbackProvider && await fallbackProvider.isConfigured()) {
        vscode.window.showWarningMessage(
          `Primary LLM provider '${this.config.provider}' not available. Using fallback: '${fallbackName}'`
        );
        return fallbackProvider;
      }
    }

    throw new Error('No configured LLM provider available. Please check your settings.');
  }

  async sendRequest(prompt: string): Promise<LLMResponse> {
    const provider = await this.getActiveProvider();
    return this.withRetry(() => provider.sendRequest(prompt));
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Unknown error during retry operation');
  }

  async validateAllProviders(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const [name, provider] of this.providers.entries()) {
      try {
        const result = await provider.validateConfiguration();
        results.push({
          ...result,
          errors: result.errors.map(err => `${name}: ${err}`),
          warnings: result.warnings.map(warn => `${name}: ${warn}`)
        });
      } catch (error) {
        results.push({
          isValid: false,
          errors: [`${name}: Validation failed - ${error}`],
          warnings: []
        });
      }
    }

    return results;
  }

  async refreshConfiguration(): Promise<void> {
    this.config = this.loadConfiguration();
    this.initializeProviders();
  }

  getProviderStatus(): Array<{ name: string; configured: boolean; active: boolean }> {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      configured: false,
      active: name === this.config.provider
    }));
  }

  async setApiKey(provider: string, key: string): Promise<void> {
    const secretKey = `llm.${provider}.apiKey`;
    await this.context.secrets.store(secretKey, key);
    
    const providerConfig = this.config.providers[provider];
    if (providerConfig) {
      providerConfig.apiKeySource = 'vscode-secrets';
      providerConfig.apiKeySecret = secretKey;
    }
  }
}