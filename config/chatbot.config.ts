import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export type ChatbotMode = "normal" | "lead";

export interface ResponseStyleConfig {
  concise: boolean;
  maxSentences: number;
}

export interface LeadConfig {
  enabled: boolean;
  requiredFields: string[];
}

export interface LLMConfig {
  provider: "groq";
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface FirebaseConfig {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  serviceAccountPath?: string;
}

export interface SecurityConfig {
  leadsApiKey?: string;
}

export interface ChatbotConfig {
  mode: ChatbotMode;
  responseStyle: ResponseStyleConfig;
  lead: LeadConfig;
  llm: LLMConfig;
  firebase: FirebaseConfig;
  security: SecurityConfig;
  contextFilePath?: string;
}

export const chatbotConfig: ChatbotConfig = {
  mode: (process.env.CHATBOT_MODE as ChatbotMode) || "lead",

  responseStyle: {
    concise: true,
    maxSentences: 3,
  },

  lead: {
    enabled: true,
    // By default, a valid lead requires at least name and email (or phone)
    requiredFields: ["name", "email"],
  },

  llm: {
    provider: "groq",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.2,
    maxTokens: 500,
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  },

  security: {
    leadsApiKey: process.env.LEADS_API_KEY,
  },

  contextFilePath: "context/context.md",
};
