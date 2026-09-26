import { describe, expect, it } from "vitest";
import { LeadExtractor } from "../src/leads/extractor.js";
import type { LLMChatInput, LLMChatOutput, LLMProvider } from "../src/core/types.js";

class MockJSONLLMProvider implements LLMProvider {
  constructor(private responseJson: Record<string, unknown>) {}

  async chat(_input: LLMChatInput): Promise<LLMChatOutput> {
    return {
      content: JSON.stringify(this.responseJson),
    };
  }
}

describe("LeadExtractor", () => {
  it("should extract lead information and merge with existing data", async () => {
    const mockLLM = new MockJSONLLMProvider({
      hasLeadIntent: true,
      name: "Sarah Connor",
      email: "sarah@cyberdyne.com",
      phone: null,
      data: {
        service: "Cloud Migration",
      },
    });

    const extractor = new LeadExtractor({ requiredFields: ["name", "email"] });
    const result = await extractor.extract(
      mockLLM,
      "My name is Sarah Connor and email is sarah@cyberdyne.com",
      [],
      {}
    );

    expect(result.hasLeadIntent).toBe(true);
    expect(result.isReadyToCreate).toBe(true);
    expect(result.leadData.name).toBe("Sarah Connor");
    expect(result.leadData.email).toBe("sarah@cyberdyne.com");
    expect(result.missingFields).toHaveLength(0);
  });

  it("should retain existing fields if user only provides email in step 2", async () => {
    const mockLLM = new MockJSONLLMProvider({
      hasLeadIntent: true,
      name: null,
      email: "sarah@cyberdyne.com",
      phone: null,
      data: null,
    });

    const extractor = new LeadExtractor({ requiredFields: ["name", "email"] });
    const result = await extractor.extract(
      mockLLM,
      "sarah@cyberdyne.com",
      [],
      { name: "Sarah Connor" }
    );

    expect(result.leadData.name).toBe("Sarah Connor");
    expect(result.leadData.email).toBe("sarah@cyberdyne.com");
    expect(result.isReadyToCreate).toBe(true);
  });
});
