import * as vscode from 'vscode';
import type { LLMProvider, ProviderConfig, ValidationResult, LLMResponse, RequestOptions } from '../../types/llmConfig';

export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;
  
  constructor(
    protected config: ProviderConfig,
    protected context: vscode.ExtensionContext
  ) {}

  async isConfigured(): Promise<boolean> {
    try {
      const validation = await this.validateConfiguration();
      return validation.isValid;
    } catch {
      return false;
    }
  }

  async validateConfiguration(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.endpoint) {
      errors.push(`${this.name}: Endpoint URL is required`);
    }

    if (!this.config.model) {
      errors.push(`${this.name}: Model name is required`);
    }

    if (this.config.apiKeySource === 'environment' && !this.config.apiKeyEnvVar) {
      errors.push(`${this.name}: Environment variable name is required when using environment API key source`);
    }

    const apiKey = await this.getApiKey();
    if (this.config.apiKeySource !== 'none' && !apiKey) {
      errors.push(`${this.name}: API key not found. Check your configuration.`);
    }

    if (this.config.temperature < 0 || this.config.temperature > 1) {
      warnings.push(`${this.name}: Temperature should be between 0 and 1`);
    }

    if (this.config.maxTokens <= 0) {
      errors.push(`${this.name}: Max tokens must be positive`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  protected async getApiKey(): Promise<string | undefined> {
    switch (this.config.apiKeySource) {
      case 'environment':
        return process.env[this.config.apiKeyEnvVar || ''];
      
      case 'vscode-secrets':
        const secretKey = this.config.apiKeySecret || `llm.${this.name}.apiKey`;
        return await this.context.secrets.get(secretKey);
      
      case 'none':
        return undefined;
      
      default:
        return undefined;
    }
  }

  protected async makeHttpRequest(
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body: string;
    }
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  protected buildHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.customHeaders
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    return headers;
  }

  abstract sendRequest(prompt: string, options?: RequestOptions): Promise<LLMResponse>;
}