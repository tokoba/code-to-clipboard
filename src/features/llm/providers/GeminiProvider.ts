import * as vscode from 'vscode';
import { BaseLLMProvider } from '../base/BaseLLMProvider';
import type { LLMResponse, ProviderConfig, RequestOptions } from '../../types/llmConfig';

interface GeminiContent {
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProvider extends BaseLLMProvider {
  name = 'gemini';

  constructor(
    config: ProviderConfig,
    context: vscode.ExtensionContext,
    timeout: number
  ) {
    super(config, context, timeout);
  }

  protected buildHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.customHeaders
    };

    return headers;
  }

  private buildEndpointUrl(): string {
    const apiKey = process.env[this.config.apiKeyEnvVar || ''];
    return `${this.config.endpoint}?key=${apiKey}`;
  }

  async sendRequest(prompt: string, options?: RequestOptions): Promise<LLMResponse> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('Google API key not configured');
    }

    const requestBody: GeminiRequest = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: options?.temperature ?? this.config.temperature,
        maxOutputTokens: options?.maxTokens ?? this.config.maxTokens
      }
    };

    const headers = this.buildHeaders();
    if (options?.customHeaders) {
      Object.assign(headers, options.customHeaders);
    }

    const url = this.buildEndpointUrl();
    const response = await this.makeHttpRequest(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as GeminiResponse;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount
      } : undefined,
      provider: this.name,
      model: this.config.model
    };
  }
}