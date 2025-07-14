import * as vscode from 'vscode';
import { BaseLLMProvider } from '../base/BaseLLMProvider';
import type { LLMResponse, ProviderConfig, RequestOptions } from '../../types/llmConfig';

interface LocalLLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LocalLLMRequest {
  model: string;
  messages: LocalLLMMessage[];
  temperature: number;
  max_tokens: number;
}

interface LocalLLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class LocalLLMProvider extends BaseLLMProvider {
  name = 'local';

  constructor(
    config: ProviderConfig,
    context: vscode.ExtensionContext,
    timeout: number
  ) {
    super(config, context, timeout);
  }

  async sendRequest(prompt: string, options?: RequestOptions): Promise<LLMResponse> {
    const apiKey = await this.getApiKey();

    const requestBody: LocalLLMRequest = {
      model: this.config.model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: options?.temperature ?? this.config.temperature,
      max_tokens: options?.maxTokens ?? this.config.maxTokens
    };

    const headers = this.buildHeaders(apiKey);
    if (options?.customHeaders) {
      Object.assign(headers, options.customHeaders);
    }

    try {
      const response = await this.makeHttpRequest(this.config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Local LLM API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as LocalLLMResponse;
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined,
        provider: this.name,
        model: this.config.model
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Local LLM request timeout. Is the server running at ${this.config.endpoint}?`);
      }
      throw error;
    }
  }
}