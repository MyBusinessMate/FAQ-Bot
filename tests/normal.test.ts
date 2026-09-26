import { describe, expect, it } from "vitest";
import { Chatbot } from "../src/core/chatbot.js";
import { ContextLoader } from "../src/core/context.js";
import type { LLMChatInput, LLMChatOutput, LLMProvider } from "../src/core/types.js";
import { InMemoryLeadRepository } from "../src/leads/repository.js";

class MockLLMProvider implements LLMProvider {
  constructor(private reply: string) {}

  async chat(_input: LLMChatInput): Promise<LLMChatOutput> {
    return { content: this.reply };
  }
}

describe("Chatbot in Normal Mode", () => {
  it("should answer questions concisely without creating or collecting leads", async () => {
    const mockContext = new ContextLoader();
    mockContext.setContext(
      "# Apex Digital\nWe provide web development and digital marketing."
    );

    const mockLLM = new MockLLMProvider(
      "We offer web development, SEO and digital marketing."
    );
    const mockRepo = new InMemoryLeadRepository();

    const bot = new Chatbot({
      config: { mode: "normal" },
      contextLoader: mockContext,
      llm: mockLLM,
      leadRepository: mockRepo,
    });

    const response = await bot.chat({
      message: "What services do you provide?",
      history: [],
      sessionId: "session-normal-1",
    });

    expect(response.message).toBe(
      "We offer web development, SEO and digital marketing."
    );
    expect(response.lead.status).toBe("none");
    expect(response.lead.id).toBeUndefined();
    expect(mockRepo.getAllLeads()).toHaveLength(0);
  });
});
