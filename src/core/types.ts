export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatInput {
  message: string;
  history?: Message[];
  sessionId?: string;
}

export type LeadStatus = "none" | "collecting" | "ready" | "created";

export interface LeadOutput {
  status: "none" | "collecting" | "created";
  id?: string;
}

export interface ChatOutput {
  message: string;
  lead: LeadOutput;
}

export interface LeadData {
  name?: string;
  email?: string;
  phone?: string;
  data?: Record<string, unknown>;
}

export interface LeadRecord {
  id: string;
  sessionId?: string;
  name?: string;
  email?: string;
  phone?: string;
  data: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LeadExtractionResult {
  hasLeadIntent: boolean;
  leadData: LeadData;
  missingFields: string[];
  isReadyToCreate: boolean;
}

export interface LLMChatInput {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: "json_object" | "text" };
}

export interface LLMChatOutput {
  content: string;
}

export interface LLMProvider {
  chat(input: LLMChatInput): Promise<LLMChatOutput>;
}

export interface LeadRepository {
  createLead(lead: {
    sessionId?: string;
    name?: string;
    email?: string;
    phone?: string;
    data?: Record<string, unknown>;
  }): Promise<LeadRecord>;

  getLeadBySessionId?(sessionId: string): Promise<LeadRecord | null>;
  getLeadById?(id: string): Promise<LeadRecord | null>;
}
