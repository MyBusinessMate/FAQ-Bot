import Groq from "groq-sdk";
import type { LLMChatInput, LLMChatOutput, LLMProvider } from "../core/types.js";
import { LLMProviderError } from "./provider.js";

export interface GroqProviderOptions {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class GroqProvider implements LLMProvider {
  private client: Groq;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(options?: GroqProviderOptions) {
    const apiKey = options?.apiKey || process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new LLMProviderError(
        "GROQ_API_KEY is not set. Please provide it in your .env file or chatbot.config.ts."
      );
    }

    this.client = new Groq({ apiKey });
    this.defaultModel = options?.model || process.env.GROQ_MODEL || "openai/gpt-oss-20b";
    this.defaultTemperature = options?.temperature ?? 0.2;
    this.defaultMaxTokens = options?.maxTokens ?? 500;
  }

  async chat(input: LLMChatInput): Promise<LLMChatOutput> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: input.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: input.temperature ?? this.defaultTemperature,
        max_tokens: input.maxTokens ?? this.defaultMaxTokens,
        response_format: input.responseFormat
          ? { type: input.responseFormat.type }
          : undefined,
      });

      const choice = response.choices[0];
      const content = choice?.message?.content?.trim() || "";

      if (!content) {
        throw new LLMProviderError("Received empty response from Groq API.");
      }

      return { content };
    } catch (error: unknown) {
      if (error instanceof LLMProviderError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Unknown Groq API error";
      throw new LLMProviderError(`Groq API invocation failed: ${message}`, error);
    }
  }
}
