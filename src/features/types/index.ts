export interface OpenAIChatCompletionMessage {
	role: string;
	content: string;
}

export interface OpenAIChatCompletionChoice {
	message?: OpenAIChatCompletionMessage;
}

export interface OpenAIChatCompletionResponse {
	choices?: OpenAIChatCompletionChoice[];
}
