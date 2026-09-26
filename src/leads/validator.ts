import type { LeadData } from "../core/types.js";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  cleanData: LeadData;
}

export class LeadValidator {
  /**
   * Validates email address format.
   */
  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== "string") return false;
    const trimmed = email.trim();
    // Standard RFC 5322 compliant regex simplified for real-world emails
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(trimmed);
  }

  /**
   * Normalizes and validates phone number.
   * Strips spaces, dashes, parentheses, keeping + and digits.
   */
  static normalizePhone(phone: string): { isValid: boolean; normalized?: string } {
    if (!phone || typeof phone !== "string") {
      return { isValid: false };
    }

    const trimmed = phone.trim();
    // Keep '+' at the beginning if present, and all digits
    const cleaned = trimmed.replace(/[^\d+]/g, "");
    // Check if contains 7 to 15 digits
    const digitsOnly = cleaned.replace(/\D/g, "");

    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return { isValid: true, normalized: cleaned };
    }

    return { isValid: false };
  }

  /**
   * Validates a name string.
   */
  static isValidName(name: string): boolean {
    if (!name || typeof name !== "string") return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 100 && !/^[0-9]+$/.test(trimmed);
  }

  /**
   * Validates lead data against required fields and formats.
   */
  static validate(
    data: LeadData,
    requiredFields: string[] = ["name", "email"]
  ): ValidationResult {
    const errors: string[] = [];
    const cleanData: LeadData = {
      data: data.data ? { ...data.data } : {},
    };

    // 1. Validate & Clean Name
    if (data.name) {
      if (this.isValidName(data.name)) {
        cleanData.name = data.name.trim();
      } else {
        errors.push("Invalid name format. Please provide a valid name.");
      }
    }

    // 2. Validate & Clean Email
    if (data.email) {
      if (this.isValidEmail(data.email)) {
        cleanData.email = data.email.trim().toLowerCase();
      } else {
        errors.push("Invalid email format.");
      }
    }

    // 3. Validate & Clean Phone
    if (data.phone) {
      const phoneValidation = this.normalizePhone(data.phone);
      if (phoneValidation.isValid && phoneValidation.normalized) {
        cleanData.phone = phoneValidation.normalized;
      } else {
        errors.push("Invalid phone number format.");
      }
    }

    // 4. Copy and clean additional data fields
    if (data.data && typeof data.data === "object") {
      for (const [key, val] of Object.entries(data.data)) {
        if (typeof val === "string") {
          const trimmed = val.trim();
          if (trimmed.length > 0) {
            cleanData.data![key] = trimmed;
          }
        } else if (val !== undefined && val !== null) {
          cleanData.data![key] = val;
        }
      }
    }

    // 5. Check required fields
    for (const field of requiredFields) {
      if (field === "name" && !cleanData.name) {
        errors.push("Name is required.");
      } else if (field === "email" && !cleanData.email) {
        errors.push("Email is required.");
      } else if (field === "phone" && !cleanData.phone) {
        errors.push("Phone is required.");
      } else if (
        field !== "name" &&
        field !== "email" &&
        field !== "phone" &&
        (!cleanData.data || !cleanData.data[field])
      ) {
        errors.push(`Field '${field}' is required.`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      cleanData,
    };
  }
}
