import type { ChatbotMode, ResponseStyleConfig } from "../../config/chatbot.config.js";
import type { LeadData, Message } from "./types.js";

export interface PromptBuilderOptions {
  mode: ChatbotMode;
  contextContent: string;
  responseStyle?: ResponseStyleConfig;
  accumulatedLeadData?: LeadData;
  missingFields?: string[];
}

export class PromptBuilder {
  /**
   * Constructs the system prompt for the conversational LLM.
   */
  static buildSystemPrompt(options: PromptBuilderOptions): string {
    const {
      mode,
      contextContent,
      responseStyle = { concise: true, maxSentences: 3 },
      accumulatedLeadData = {},
      missingFields = [],
    } = options;

    const baseRules = [
      `You are a knowledgeable, direct, and helpful assistant for the business described below.`,
      `RESPONSE STYLE RULES:`,
      `- Keep responses short, direct, and conversational.`,
      `- Aim for ${responseStyle.maxSentences} sentences maximum.`,
      `- Never say "As an AI...", "I'd be happy to assist you with...", or other robotic filler.`,
      `- Answer only using the business context provided. If information is not in the context, politely state you do not have that information and offer to connect them with the team.`,
      `- Do NOT dump long paragraphs or unnecessary lists unless explicitly asked.`,
    ];

    let modeInstructions = "";

    if (mode === "normal") {
      modeInstructions = `
MODE: NORMAL (Strictly Informational Q&A)
- Answer the user's questions clearly, concisely, and accurately based on the business context.
- NEVER ask the user for their personal details, contact information, name, email, or phone number.
- Do NOT attempt to capture leads or collect customer information under any circumstance.
- If the user expresses interest in hiring or getting services, simply tell them how they can reach out (using the contact email/phone from context) rather than asking them for their details.
`;
    } else {
      const knownInfo = Object.entries(accumulatedLeadData)
        .filter(([k, v]) => v && (typeof v !== "object" || Object.keys(v).length > 0))
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(", ");

      modeInstructions = `
MODE: LEAD GENERATION (Sales Assistant)
- Goal: Naturally converse, answer questions, and collect essential customer details one step at a time.
- CURRENTLY KNOWN USER INFO: ${knownInfo ? knownInfo : "None yet"}
- STILL NEEDED FIELDS: ${missingFields.length > 0 ? missingFields.join(", ") : "All required details collected"}

LEAD CONVERSATION RULES:
1. Always answer the user's immediate question first in 1 sentence.
2. If the user indicates interest in a project, service, or pricing:
   - Ask for ONE missing piece of information at a time in a natural, friendly manner.
   - Do NOT ask for information that is ALREADY KNOWN above (e.g. if their name is known, do not ask for their name again).
   - Do NOT ask multiple questions in a single message.
3. Once all required details (such as name and email/phone) are collected:
   - Thank the user warmly and let them know the team will get in touch shortly.
`;
    }

    return `
${baseRules.join("\n")}

${modeInstructions}

---
BUSINESS CONTEXT:
${contextContent}
---
`.trim();
  }

  /**
   * Prepares the complete message history array to send to the LLM.
   */
  static buildMessages(
    systemPrompt: string,
    history: Message[] = [],
    currentUserMessage: string
  ): Message[] {
    const messages: Message[] = [
      { role: "system", content: systemPrompt },
      ...history,
    ];

    if (currentUserMessage.trim()) {
      messages.push({ role: "user", content: currentUserMessage.trim() });
    }

    return messages;
  }
}
