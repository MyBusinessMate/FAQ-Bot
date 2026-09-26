import { describe, expect, it } from "vitest";
import { InMemoryLeadRepository } from "../src/leads/repository.js";

describe("InMemoryLeadRepository", () => {
  it("should create and retrieve leads without storing chat history", async () => {
    const repo = new InMemoryLeadRepository();

    const lead = await repo.createLead({
      sessionId: "session-123",
      name: "Abdul",
      email: "abdul@example.com",
      phone: "+919876543210",
      data: {
        service: "Next.js Web Application",
        budget: "₹2,00,000",
      },
    });

    expect(lead.id).toBeDefined();
    expect(lead.name).toBe("Abdul");
    expect(lead.email).toBe("abdul@example.com");
    expect(lead.data.service).toBe("Next.js Web Application");

    // Retrieve by ID
    const found = await repo.getLeadById(lead.id);
    expect(found).not.toBeNull();
    expect(found?.email).toBe("abdul@example.com");

    // Retrieve by Session ID
    const foundSession = await repo.getLeadBySessionId("session-123");
    expect(foundSession).not.toBeNull();
    expect(foundSession?.name).toBe("Abdul");

    // Verify chat messages are not on the lead record
    expect((found as any).messages).toBeUndefined();
    expect((found as any).history).toBeUndefined();
  });
});
