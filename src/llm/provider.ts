import type { LLMChatInput, LLMChatOutput, LLMProvider } from "../core/types.js";

export type { LLMChatInput, LLMChatOutput, LLMProvider };

export class LLMProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LLMProviderError";
  }
}
