import type { ChatbotConfig } from "../../config/chatbot.config.js";
import { chatbotConfig } from "../../config/chatbot.config.js";
import { GroqProvider } from "../llm/groq.js";
import { createDefaultLeadRepository } from "../leads/repository.js";
import { LeadModeHandler } from "../modes/lead.js";
import { NormalModeHandler } from "../modes/normal.js";
import { ContextLoader } from "./context.js";
import type {
  ChatInput,
  ChatOutput,
  LeadRecord,
  LeadRepository,
  LLMProvider,
} from "./types.js";

export interface ChatbotOptions {
  config?: Partial<ChatbotConfig>;
  contextLoader?: ContextLoader;
  llm?: LLMProvider;
  leadRepository?: LeadRepository;
}

export class Chatbot {
  private config: ChatbotConfig;
  private contextLoader: ContextLoader;
  private llm: LLMProvider;
  private leadRepository: LeadRepository;

  constructor(options?: ChatbotOptions) {
    this.config = {
      ...chatbotConfig,
      ...(options?.config || {}),
      responseStyle: {
        ...chatbotConfig.responseStyle,
        ...(options?.config?.responseStyle || {}),
      },
      lead: {
        ...chatbotConfig.lead,
        ...(options?.config?.lead || {}),
      },
      llm: {
        ...chatbotConfig.llm,
        ...(options?.config?.llm || {}),
      },
      firebase: {
        ...chatbotConfig.firebase,
        ...(options?.config?.firebase || {}),
      },
      security: {
        ...chatbotConfig.security,
        ...(options?.config?.security || {}),
      },
    };

    this.contextLoader =
      options?.contextLoader ||
      new ContextLoader({ filePath: this.config.contextFilePath });

    this.llm =
      options?.llm ||
      new GroqProvider({
        apiKey: this.config.llm.apiKey,
        model: this.config.llm.model,
        temperature: this.config.llm.temperature,
        maxTokens: this.config.llm.maxTokens,
      });

    this.leadRepository =
      options?.leadRepository || createDefaultLeadRepository();
  }

  /**
   * Main entry point for chatting with the AI bot.
   * Framework-independent and suitable for CLI, Next.js API route, TanStack, etc.
   */
  async chat(input: ChatInput): Promise<ChatOutput> {
    if (!input || typeof input.message !== "string") {
      throw new Error("Invalid input: message string is required.");
    }

    const trimmedMessage = input.message.trim();
    if (!trimmedMessage) {
      return {
        message: "Please type a message.",
        lead: { status: "none" },
      };
    }

    const contextContent = this.contextLoader.load();
    const mode = this.config.mode;

    if (mode === "lead" && this.config.lead.enabled) {
      const handler = new LeadModeHandler({
        config: this.config,
        contextContent,
        llm: this.llm,
        leadRepository: this.leadRepository,
      });

      return await handler.handle({
        ...input,
        message: trimmedMessage,
      });
    }

    // Default to normal mode
    const normalHandler = new NormalModeHandler({
      config: this.config,
      contextContent,
      llm: this.llm,
    });

    return await normalHandler.handle({
      ...input,
      message: trimmedMessage,
    });
  }

  /**
   * Reloads the markdown context file from disk.
   */
  reloadContext(): void {
    this.contextLoader.load(true);
  }

  /**
   * Returns current active mode.
   */
  getMode(): string {
    return this.config.mode;
  }

  /**
   * Access the underlying Lead repository.
   */
  getLeadRepository(): LeadRepository {
    return this.leadRepository;
  }

  /**
   * Retrieve stored leads from the repository.
   */
  async getLeads(options?: { limit?: number; offset?: number }): Promise<LeadRecord[]> {
    if (this.leadRepository.getLeads) {
      return await this.leadRepository.getLeads(options);
    }
    return [];
  }
}
