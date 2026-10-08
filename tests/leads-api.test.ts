import { describe, expect, it } from "vitest";
import { handleLeadsWebRequest } from "../src/api/leads.js";
import { Chatbot } from "../src/core/chatbot.js";
import { InMemoryLeadRepository } from "../src/leads/repository.js";

describe("GET /api/leads Web Handler", () => {
  it("should reject unauthenticated requests with 401", async () => {
    process.env.LEADS_API_KEY = "test-secret-key-xyz";

    const req = new Request("http://localhost/api/leads", {
      method: "GET",
    });

    const res = await handleLeadsWebRequest(req);
    expect(res.status).toBe(401);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain("Unauthorized");
  });

  it("should reject requests with invalid key with 403", async () => {
    process.env.LEADS_API_KEY = "test-secret-key-xyz";

    const req = new Request("http://localhost/api/leads", {
      method: "GET",
      headers: {
        Authorization: "Bearer wrong-key",
      },
    });

    const res = await handleLeadsWebRequest(req);
    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
    expect(json.error).toContain("Forbidden");
  });

  it("should return leads when valid Authorization header is passed", async () => {
    process.env.LEADS_API_KEY = "test-secret-key-xyz";

    const repo = new InMemoryLeadRepository();
    await repo.createLead({ name: "Sarah Connor", email: "sarah@example.com" });

    const bot = new Chatbot({
      leadRepository: repo,
    });

    const req = new Request("http://localhost/api/leads", {
      method: "GET",
      headers: {
        Authorization: "Bearer test-secret-key-xyz",
      },
    });

    const res = await handleLeadsWebRequest(req, bot);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);
    expect(json.leads[0].name).toBe("Sarah Connor");
    expect(json.leads[0].email).toBe("sarah@example.com");
  });

  it("should return leads when valid x-api-key header is passed", async () => {
    process.env.LEADS_API_KEY = "test-secret-key-xyz";

    const repo = new InMemoryLeadRepository();
    await repo.createLead({ name: "John Doe", email: "john@example.com" });

    const bot = new Chatbot({
      leadRepository: repo,
    });

    const req = new Request("http://localhost/api/leads", {
      method: "GET",
      headers: {
        "x-api-key": "test-secret-key-xyz",
      },
    });

    const res = await handleLeadsWebRequest(req, bot);
    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.count).toBe(1);
    expect(json.leads[0].name).toBe("John Doe");
  });
});
