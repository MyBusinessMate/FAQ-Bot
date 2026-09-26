import type { ChatbotConfig } from "../../config/chatbot.config.js";
import { PromptBuilder } from "../core/prompt.js";
import type {
  ChatInput,
  ChatOutput,
  LeadData,
  LeadRepository,
  LLMProvider,
} from "../core/types.js";
import { LeadExtractor } from "../leads/extractor.js";

export interface LeadModeOptions {
  config: ChatbotConfig;
  contextContent: string;
  llm: LLMProvider;
  leadRepository: LeadRepository;
}

export class LeadModeHandler {
  private config: ChatbotConfig;
  private contextContent: string;
  private llm: LLMProvider;
  private leadRepository: LeadRepository;
  private extractor: LeadExtractor;

  // Transient in-memory lead state tracker per session
  private static sessionLeads: Map<string, { leadData: LeadData; createdId?: string }> =
    new Map();

  constructor(options: LeadModeOptions) {
    this.config = options.config;
    this.contextContent = options.contextContent;
    this.llm = options.llm;
    this.leadRepository = options.leadRepository;
    this.extractor = new LeadExtractor({
      requiredFields: this.config.lead.requiredFields,
    });
  }

  async handle(input: ChatInput): Promise<ChatOutput> {
    const sessionKey = input.sessionId || "default-session";
    const sessionState = LeadModeHandler.sessionLeads.get(sessionKey) || {
      leadData: {},
    };

    // If a lead was already created for this session, we don't recreate it
    if (sessionState.createdId) {
      const systemPrompt = PromptBuilder.buildSystemPrompt({
        mode: "lead",
        contextContent: this.contextContent,
        responseStyle: this.config.responseStyle,
        accumulatedLeadData: sessionState.leadData,
        missingFields: [],
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
          status: "created",
          id: sessionState.createdId,
        },
      };
    }

    // Step 1: Extract and validate lead data from conversation
    const extraction = await this.extractor.extract(
      this.llm,
      input.message,
      input.history || [],
      sessionState.leadData
    );

    // Update accumulated session lead data
    sessionState.leadData = extraction.leadData;
    LeadModeHandler.sessionLeads.set(sessionKey, sessionState);

    let createdLeadId: string | undefined;
    let leadStatus: "none" | "collecting" | "created" = "none";

    // Step 2: Check if lead is ready to create and save to database
    if (extraction.isReadyToCreate) {
      const leadRecord = await this.leadRepository.createLead({
        sessionId: input.sessionId,
        name: extraction.leadData.name,
        email: extraction.leadData.email,
        phone: extraction.leadData.phone,
        data: extraction.leadData.data,
      });

      createdLeadId = leadRecord.id;
      sessionState.createdId = createdLeadId;
      LeadModeHandler.sessionLeads.set(sessionKey, sessionState);
      leadStatus = "created";
    } else if (extraction.hasLeadIntent) {
      leadStatus = "collecting";
    }

    // Step 3: Generate the conversational assistant response
    const systemPrompt = PromptBuilder.buildSystemPrompt({
      mode: "lead",
      contextContent: this.contextContent,
      responseStyle: this.config.responseStyle,
      accumulatedLeadData: sessionState.leadData,
      missingFields: extraction.missingFields,
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
        status: leadStatus,
        id: createdLeadId,
      },
    };
  }

  /**
   * Helper to reset session state (useful for tests or session cleanup).
   */
  static clearSession(sessionId?: string): void {
    if (sessionId) {
      LeadModeHandler.sessionLeads.delete(sessionId);
    } else {
      LeadModeHandler.sessionLeads.clear();
    }
  }
}
