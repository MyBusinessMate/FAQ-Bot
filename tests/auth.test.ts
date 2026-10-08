import { describe, expect, it } from "vitest";
import { extractApiKey, validateLeadsApiKey } from "../src/api/auth.js";

describe("API Security & Auth Helpers", () => {
  it("should extract Bearer token from authorization header", () => {
    const token = extractApiKey({ authorization: "Bearer secret-token-123" });
    expect(token).toBe("secret-token-123");
  });

  it("should extract API key from x-api-key header", () => {
    const token = extractApiKey({ "x-api-key": "my-x-key" });
    expect(token).toBe("my-x-key");
  });

  it("should extract API key from query string if headers are missing", () => {
    const token = extractApiKey({}, "query-key-789");
    expect(token).toBe("query-key-789");
  });

  it("should validate matching API key", () => {
    const result = validateLeadsApiKey("valid_key", "valid_key");
    expect(result.authenticated).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should reject invalid API key with 403 Forbidden", () => {
    const result = validateLeadsApiKey("wrong_key", "correct_key");
    expect(result.authenticated).toBe(false);
    expect(result.statusCode).toBe(403);
    expect(result.error).toContain("Forbidden");
  });

  it("should reject missing API key with 401 Unauthorized", () => {
    const result = validateLeadsApiKey(null, "correct_key");
    expect(result.authenticated).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.error).toContain("Unauthorized");
  });

  it("should return 500 if server environment has no LEADS_API_KEY set", () => {
    const oldKey = process.env.LEADS_API_KEY;
    delete process.env.LEADS_API_KEY;

    const result = validateLeadsApiKey("any_key", undefined);
    expect(result.authenticated).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.error).toContain("LEADS_API_KEY is not configured");

    if (oldKey) process.env.LEADS_API_KEY = oldKey;
  });
});
