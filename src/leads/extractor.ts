import type {
  LeadData,
  LeadExtractionResult,
  LLMProvider,
  Message,
} from "../core/types.js";
import { LeadValidator } from "./validator.js";

export interface ExtractorOptions {
  requiredFields?: string[];
}

export class LeadExtractor {
  private requiredFields: string[];

  constructor(options?: ExtractorOptions) {
    this.requiredFields = options?.requiredFields || ["name", "email"];
  }

  /**
   * Analyzes the conversation and extracts structured lead details.
   */
  async extract(
    llm: LLMProvider,
    message: string,
    history: Message[] = [],
    existingData: LeadData = {}
  ): Promise<LeadExtractionResult> {
    const prompt = `You are a high-accuracy lead extraction engine.
Analyze the following conversation and extract any contact and project requirements provided by the user.

CURRENT ACCUMULATED LEAD DATA:
${JSON.stringify(existingData, null, 2)}

RECENT CONVERSATION HISTORY:
${history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

LATEST USER MESSAGE:
USER: ${message}

INSTRUCTIONS:
1. Determine if the user is interested in services/products or providing lead information (hasLeadIntent: true/false).
2. Extract the user's name, email, phone number, and any other business details (e.g., service, requirements, budget, company, timeline) into the "data" object.
3. If a value was already present in accumulated lead data and the user did not update/correct it, KEEP the existing value.
4. If a field was NOT provided, use null.
5. Return ONLY a valid JSON object matching this schema:
{
  "hasLeadIntent": boolean,
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "data": {
    "service": string | null,
    "requirements": string | null,
    "budget": string | null,
    "company": string | null
  }
}`;

    try {
      const response = await llm.chat({
        messages: [
          {
            role: "system",
            content: "You are a JSON-only data extraction assistant. Return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.0,
        responseFormat: { type: "json_object" },
      });

      const parsed = this.safeParseJSON(response.content);

      const mergedData: LeadData = {
        name: parsed.name || existingData.name,
        email: parsed.email || existingData.email,
        phone: parsed.phone || existingData.phone,
        data: {
          ...(existingData.data || {}),
          ...(parsed.data || {}),
        },
      };

      // Clean up null/undefined entries in data
      if (mergedData.data) {
        for (const [k, v] of Object.entries(mergedData.data)) {
          if (v === null || v === undefined || v === "") {
            delete mergedData.data[k];
          }
        }
      }

      // Validate through application validator
      const validation = LeadValidator.validate(mergedData, this.requiredFields);
      const missingFields: string[] = [];

      for (const field of this.requiredFields) {
        if (field === "name" && !validation.cleanData.name) {
          missingFields.push("name");
        } else if (field === "email" && !validation.cleanData.email) {
          missingFields.push("email");
        } else if (field === "phone" && !validation.cleanData.phone) {
          missingFields.push("phone");
        } else if (
          field !== "name" &&
          field !== "email" &&
          field !== "phone" &&
          (!validation.cleanData.data || !validation.cleanData.data[field])
        ) {
          missingFields.push(field);
        }
      }

      const hasLeadIntent =
        Boolean(parsed.hasLeadIntent) ||
        Boolean(mergedData.name) ||
        Boolean(mergedData.email) ||
        Boolean(mergedData.phone) ||
        Object.keys(mergedData.data || {}).length > 0;

      const isReadyToCreate = validation.isValid;

      return {
        hasLeadIntent,
        leadData: validation.cleanData,
        missingFields,
        isReadyToCreate,
      };
    } catch {
      // Fallback in case of parsing/LLM extraction failure: use safe regex fallback
      return this.fallbackRegexExtraction(message, existingData);
    }
  }

  private safeParseJSON(content: string): Record<string, any> {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : content;
      return JSON.parse(jsonStr);
    } catch {
      return {};
    }
  }

  private fallbackRegexExtraction(
    message: string,
    existingData: LeadData
  ): LeadExtractionResult {
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = message.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

    const mergedData: LeadData = {
      name: existingData.name,
      email: emailMatch ? emailMatch[0] : existingData.email,
      phone: phoneMatch ? phoneMatch[0] : existingData.phone,
      data: { ...(existingData.data || {}) },
    };

    const validation = LeadValidator.validate(mergedData, this.requiredFields);
    const missingFields = this.requiredFields.filter(
      (f) =>
        (f === "name" && !validation.cleanData.name) ||
        (f === "email" && !validation.cleanData.email) ||
        (f === "phone" && !validation.cleanData.phone)
    );

    return {
      hasLeadIntent: Boolean(mergedData.email || mergedData.phone || mergedData.name),
      leadData: validation.cleanData,
      missingFields,
      isReadyToCreate: validation.isValid,
    };
  }
}
