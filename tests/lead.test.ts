import { beforeEach, describe, expect, it } from "vitest";
import { Chatbot } from "../src/core/chatbot.js";
import { ContextLoader } from "../src/core/context.js";
import type { LLMChatInput, LLMChatOutput, LLMProvider } from "../src/core/types.js";
import { InMemoryLeadRepository } from "../src/leads/repository.js";
import { LeadModeHandler } from "../src/modes/lead.js";

class MockSequentialLLMProvider implements LLMProvider {
  private responses: Array<(input: LLMChatInput) => string> = [];
  public callCount = 0;

  constructor(responses: Array<(input: LLMChatInput) => string>) {
    this.responses = responses;
  }

  async chat(input: LLMChatInput): Promise<LLMChatOutput> {
    const fn = this.responses[this.callCount] || this.responses[this.responses.length - 1];
    this.callCount++;
    return { content: fn(input) };
  }
}

describe("Chatbot in Lead Mode", () => {
  let mockContext: ContextLoader;
  let mockRepo: InMemoryLeadRepository;

  beforeEach(() => {
    LeadModeHandler.clearSession();
    mockContext = new ContextLoader();
    mockContext.setContext(
      "# Apex Digital\nWe build custom websites.\nLead fields: name, email, requirements."
    );
    mockRepo = new InMemoryLeadRepository();
  });

  it("should handle full lead generation flow and save lead to repository", async () => {
    const mockLLM = new MockSequentialLLMProvider([
      // Step 1: Extraction call (detects service inquiry)
      () =>
        JSON.stringify({
          hasLeadIntent: true,
          name: null,
          email: null,
          phone: null,
          data: { service: "Business Website" },
        }),
      // Step 1: Assistant reply
      () => "Sure. What is your name?",
      // Step 2: Extraction call (receives name)
      () =>
        JSON.stringify({
          hasLeadIntent: true,
          name: "Abdul",
          email: null,
          phone: null,
          data: { service: "Business Website" },
        }),
      // Step 2: Assistant reply
      () => "Thanks, Abdul. What is your email?",
      // Step 3: Extraction call (receives email, valid!)
      () =>
        JSON.stringify({
          hasLeadIntent: true,
          name: "Abdul",
          email: "abdul@example.com",
          phone: null,
          data: { service: "Business Website" },
        }),
      // Step 3: Assistant reply
      () => "Thank you Abdul! We will contact you soon.",
    ]);

    const bot = new Chatbot({
      config: { mode: "lead" },
      contextLoader: mockContext,
      llm: mockLLM,
      leadRepository: mockRepo,
    });

    // Step 1
    const res1 = await bot.chat({
      message: "I need a business website",
      sessionId: "session-flow-1",
    });
    expect(res1.lead.status).toBe("collecting");
    expect(res1.message).toBe("Sure. What is your name?");
    expect(mockRepo.getAllLeads()).toHaveLength(0);

    // Step 2
    const res2 = await bot.chat({
      message: "Abdul",
      history: [
        { role: "user", content: "I need a business website" },
        { role: "assistant", content: res1.message },
      ],
      sessionId: "session-flow-1",
    });
    expect(res2.lead.status).toBe("collecting");
    expect(res2.message).toBe("Thanks, Abdul. What is your email?");
    expect(mockRepo.getAllLeads()).toHaveLength(0);

    // Step 3
    const res3 = await bot.chat({
      message: "abdul@example.com",
      history: [
        { role: "user", content: "I need a business website" },
        { role: "assistant", content: res1.message },
        { role: "user", content: "Abdul" },
        { role: "assistant", content: res2.message },
      ],
      sessionId: "session-flow-1",
    });

    expect(res3.lead.status).toBe("created");
    expect(res3.lead.id).toBeDefined();
    expect(mockRepo.getAllLeads()).toHaveLength(1);
    const created = mockRepo.getAllLeads()[0];
    expect(created.name).toBe("Abdul");
    expect(created.email).toBe("abdul@example.com");
    expect(created.data.service).toBe("Business Website");
  });

  it("should immediately create lead if user provides name and email upfront", async () => {
    const mockLLM = new MockSequentialLLMProvider([
      // Extraction call
      () =>
        JSON.stringify({
          hasLeadIntent: true,
          name: "Abdul",
          email: "abdul@example.com",
          phone: null,
          data: { requirements: "Need website consultation" },
        }),
      // Response
      () => "Thanks Abdul! I have recorded your details and our team will get in touch shortly.",
    ]);

    const bot = new Chatbot({
      config: { mode: "lead" },
      contextLoader: mockContext,
      llm: mockLLM,
      leadRepository: mockRepo,
    });

    const res = await bot.chat({
      message: "My name is Abdul, email is abdul@example.com and I need website consultation.",
      sessionId: "session-upfront-1",
    });

    expect(res.lead.status).toBe("created");
    expect(res.lead.id).toBeDefined();
    expect(mockRepo.getAllLeads()).toHaveLength(1);
    expect(mockRepo.getAllLeads()[0].email).toBe("abdul@example.com");
  });

  it("should not create lead if email format is invalid", async () => {
    const mockLLM = new MockSequentialLLMProvider([
      // Extraction call
      () =>
        JSON.stringify({
          hasLeadIntent: true,
          name: "Abdul",
          email: "invalid-email-address",
          phone: null,
          data: null,
        }),
      // Response
      () => "That email seems invalid. Could you provide a valid email address?",
    ]);

    const bot = new Chatbot({
      config: { mode: "lead" },
      contextLoader: mockContext,
      llm: mockLLM,
      leadRepository: mockRepo,
    });

    const res = await bot.chat({
      message: "My name is Abdul and email is invalid-email-address",
      sessionId: "session-invalid-email",
    });

    expect(res.lead.status).toBe("collecting");
    expect(mockRepo.getAllLeads()).toHaveLength(0);
  });
});
