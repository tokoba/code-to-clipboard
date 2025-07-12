import { BaseLLMProvider } from '../base/BaseLLMProvider';
import type { LLMResponse, RequestOptions } from '../../types/llmConfig';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens: number;
}

interface OpenAIResponse {
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

export class OpenAIProvider extends BaseLLMProvider {
  name = 'openai';

  async sendRequest(prompt: string, options?: RequestOptions): Promise<LLMResponse> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const requestBody: OpenAIRequest = {
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

    const response = await this.makeHttpRequest(this.config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as OpenAIResponse;
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
  }
}