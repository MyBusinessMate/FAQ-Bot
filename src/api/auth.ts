import type { IncomingHttpHeaders } from "http";

export interface AuthValidationResult {
  authenticated: boolean;
  error?: string;
  statusCode?: number;
}

/**
 * Extracts authorization token / API key from standard HTTP headers or query string.
 * Supports:
 * - `Authorization: Bearer <key>`
 * - `x-api-key: <key>`
 * - `apiKey` or `key` query parameter
 */
export function extractApiKey(
  headers: IncomingHttpHeaders | Headers | Record<string, string | string[] | undefined>,
  urlQueryApiKey?: string | null
): string | null {
  // If headers is a Web standard Headers object (Fetch API / Next App router)
  if (typeof (headers as Headers)?.get === "function") {
    const webHeaders = headers as Headers;
    const authHeader = webHeaders.get("authorization") || webHeaders.get("Authorization");
    if (authHeader) {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) return match[1].trim();
      return authHeader.trim();
    }
    const xApiKey = webHeaders.get("x-api-key") || webHeaders.get("X-Api-Key");
    if (xApiKey) return xApiKey.trim();
  } else {
    // Node IncomingHttpHeaders / Plain object
    const rawHeaders = headers as Record<string, string | string[] | undefined>;
    const authHeader = rawHeaders["authorization"] || rawHeaders["Authorization"];
    if (typeof authHeader === "string") {
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (match) return match[1].trim();
      return authHeader.trim();
    }
    const xApiKey = rawHeaders["x-api-key"] || rawHeaders["X-Api-Key"];
    if (typeof xApiKey === "string") return xApiKey.trim();
  }

  if (urlQueryApiKey && typeof urlQueryApiKey === "string") {
    return urlQueryApiKey.trim();
  }

  return null;
}

/**
 * Verifies that the provided API key matches the expected secret from environment / config.
 */
export function validateLeadsApiKey(
  providedKey: string | null,
  configuredKey?: string
): AuthValidationResult {
  const secret = configuredKey || process.env.LEADS_API_KEY;

  if (!secret) {
    return {
      authenticated: false,
      statusCode: 500,
      error: "Server configuration error: LEADS_API_KEY is not configured in environment variables.",
    };
  }

  if (!providedKey) {
    return {
      authenticated: false,
      statusCode: 401,
      error: "Unauthorized: Missing API Key. Provide it via 'Authorization: Bearer <key>' or 'x-api-key: <key>'.",
    };
  }

  if (providedKey !== secret) {
    return {
      authenticated: false,
      statusCode: 403,
      error: "Forbidden: Invalid API Key.",
    };
  }

  return {
    authenticated: true,
  };
}
