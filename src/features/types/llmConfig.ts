export interface LLMConfiguration {
    provider: string
    providers: Record<string, ProviderConfig>
    fallbackProviders: string[]
    timeout: number
    retryAttempts: number
}

export interface ProviderConfig {
    endpoint: string
    model: string
    apiKeySource: "environment" | "vscode-secrets" | "none"
    apiKeyEnvVar?: string
    apiKeySecret?: string
    temperature: number
    maxTokens: number
    customHeaders?: Record<string, string>
}

export interface LLMProvider {
    name: string
    isConfigured(): Promise<boolean>
    validateConfiguration(): Promise<ValidationResult>
    sendRequest(prompt: string, options?: RequestOptions): Promise<LLMResponse>
}

export interface LLMResponse {
    content: string
    usage?: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
    }
    provider: string
    model: string
}

export interface ValidationResult {
    isValid: boolean
    errors: string[]
    warnings: string[]
}

export interface RequestOptions {
    temperature?: number
    maxTokens?: number
    customHeaders?: Record<string, string>
}

export enum LLMProviderType {
    OPENAI = "openai",
    GEMINI = "gemini",
    CLAUDE = "claude",
    LOCAL = "local",
}

export const DEFAULT_LLM_CONFIG: LLMConfiguration = {
    provider: LLMProviderType.OPENAI,
    providers: {
        [LLMProviderType.OPENAI]: {
            endpoint: "https://api.openai.com/v1/chat/completions",
            model: "gpt-4o",
            apiKeySource: "environment",
            apiKeyEnvVar: "OPENAI_API_KEY",
            temperature: 0,
            maxTokens: 4096,
        },
        [LLMProviderType.GEMINI]: {
            endpoint:
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
            model: "gemini-pro",
            apiKeySource: "environment",
            apiKeyEnvVar: "GOOGLE_API_KEY",
            temperature: 0,
            maxTokens: 4096,
        },
        [LLMProviderType.CLAUDE]: {
            endpoint: "https://api.anthropic.com/v1/messages",
            model: "claude-3-sonnet-20240229",
            apiKeySource: "environment",
            apiKeyEnvVar: "ANTHROPIC_API_KEY",
            temperature: 0,
            maxTokens: 4096,
        },
        [LLMProviderType.LOCAL]: {
            endpoint: "http://localhost:5130/v1/chat/completions",
            model: "codellama:latest",
            apiKeySource: "environment",
            apiKeyEnvVar: "LOCAL_LLM_APIKEY",
            temperature: 0,
            maxTokens: 4096,
        },
    },
    fallbackProviders: [LLMProviderType.OPENAI, LLMProviderType.LOCAL],
    timeout: 30000,
    retryAttempts: 2,
}
