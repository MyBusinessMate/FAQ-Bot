import { describe, expect, it } from "vitest";
import { LeadValidator } from "../src/leads/validator.js";

describe("LeadValidator", () => {
  describe("isValidEmail", () => {
    it("should accept valid email addresses", () => {
      expect(LeadValidator.isValidEmail("abdul@example.com")).toBe(true);
      expect(LeadValidator.isValidEmail("john.doe+work@company.co.in")).toBe(true);
      expect(LeadValidator.isValidEmail("alex_123@test.io")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(LeadValidator.isValidEmail("")).toBe(false);
      expect(LeadValidator.isValidEmail("plainaddress")).toBe(false);
      expect(LeadValidator.isValidEmail("abdul@")).toBe(false);
      expect(LeadValidator.isValidEmail("@domain.com")).toBe(false);
      expect(LeadValidator.isValidEmail("abdul@domain")).toBe(false);
    });
  });

  describe("normalizePhone", () => {
    it("should normalize valid phone numbers", () => {
      const res1 = LeadValidator.normalizePhone("+91 98765-43210");
      expect(res1.isValid).toBe(true);
      expect(res1.normalized).toBe("+919876543210");

      const res2 = LeadValidator.normalizePhone("(555) 123-4567");
      expect(res2.isValid).toBe(true);
      expect(res2.normalized).toBe("5551234567");
    });

    it("should reject invalid phone numbers", () => {
      expect(LeadValidator.normalizePhone("123").isValid).toBe(false);
      expect(LeadValidator.normalizePhone("not-a-phone").isValid).toBe(false);
      expect(LeadValidator.normalizePhone("").isValid).toBe(false);
    });
  });

  describe("validate", () => {
    it("should pass when required fields are valid", () => {
      const result = LeadValidator.validate(
        {
          name: "Abdul Rahman",
          email: "abdul@example.com",
          phone: "+91 9876543210",
          data: { service: "Web Development" },
        },
        ["name", "email"]
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.cleanData.name).toBe("Abdul Rahman");
      expect(result.cleanData.email).toBe("abdul@example.com");
    });

    it("should fail when required email is missing or invalid", () => {
      const result = LeadValidator.validate(
        {
          name: "Abdul Rahman",
          email: "invalid-email",
        },
        ["name", "email"]
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should fail when required name is missing", () => {
      const result = LeadValidator.validate(
        {
          email: "abdul@example.com",
        },
        ["name", "email"]
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Name is required.");
    });
  });
});
