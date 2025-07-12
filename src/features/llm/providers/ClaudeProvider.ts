import { BaseLLMProvider } from '../base/BaseLLMProvider';
import type { LLMResponse, RequestOptions } from '../../types/llmConfig';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  messages: ClaudeMessage[];
}

interface ClaudeResponse {
  content: Array<{
    text: string;
    type: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeProvider extends BaseLLMProvider {
  name = 'claude';

  protected buildHeaders(apiKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      ...this.config.customHeaders
    };

    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    return headers;
  }

  async sendRequest(prompt: string, options?: RequestOptions): Promise<LLMResponse> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const requestBody: ClaudeRequest = {
      model: this.config.model,
      max_tokens: options?.maxTokens ?? this.config.maxTokens,
      temperature: options?.temperature ?? this.config.temperature,
      messages: [
        { role: 'user', content: prompt }
      ]
    };

    const headers = this.buildHeaders(apiKey);
    if (options?.customHeaders) {
      Object.assign(headers, options.customHeaders);
    }

    const response = await this.makeHttpRequest(this.config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as ClaudeResponse;
    const content = data.content?.[0]?.text || '';

    return {
      content,
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      } : undefined,
      provider: this.name,
      model: this.config.model
    };
  }
}