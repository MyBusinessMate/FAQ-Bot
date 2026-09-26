import type { ChatbotConfig } from "../../config/chatbot.config.js";
import { PromptBuilder } from "../core/prompt.js";
import type { ChatInput, ChatOutput, LLMProvider } from "../core/types.js";

export interface NormalModeOptions {
  config: ChatbotConfig;
  contextContent: string;
  llm: LLMProvider;
}

export class NormalModeHandler {
  private config: ChatbotConfig;
  private contextContent: string;
  private llm: LLMProvider;

  constructor(options: NormalModeOptions) {
    this.config = options.config;
    this.contextContent = options.contextContent;
    this.llm = options.llm;
  }

  async handle(input: ChatInput): Promise<ChatOutput> {
    const systemPrompt = PromptBuilder.buildSystemPrompt({
      mode: "normal",
      contextContent: this.contextContent,
      responseStyle: this.config.responseStyle,
    });

    const messages = PromptBuilder.buildMessages(
      systemPrompt,
      input.history || [],
      input.message
    );

    const response = await this.llm.chat({
      messages,
      temperature: this.config.llm.temperature,
      maxTokens: this.config.llm.maxTokens,
    });

    return {
      message: response.content,
      lead: {
        status: "none",
      },
    };
  }
}
