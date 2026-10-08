import type { IncomingMessage, ServerResponse } from "http";
import { Chatbot } from "../core/chatbot.js";
import { extractApiKey, validateLeadsApiKey } from "./auth.js";

let sharedBotInstance: Chatbot | null = null;
function getChatbot(): Chatbot {
  if (!sharedBotInstance) {
    sharedBotInstance = new Chatbot();
  }
  return sharedBotInstance;
}

/**
 * Node.js / Express / Next.js Pages Router compatible handler for GET /api/leads
 */
export async function handleLeadsNodeHttp(
  req: IncomingMessage & { query?: Record<string, string | string[]>; url?: string },
  res: ServerResponse,
  customBot?: Chatbot
): Promise<void> {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Method Not Allowed. Use GET." }));
    return;
  }

  // Parse query parameters
  const urlObj = new URL(req.url || "/", "http://localhost");
  const limitParam = urlObj.searchParams.get("limit") || (req.query?.limit as string);
  const offsetParam = urlObj.searchParams.get("offset") || (req.query?.offset as string);
  const queryApiKey = urlObj.searchParams.get("apiKey") || urlObj.searchParams.get("key");

  const limit = limitParam ? parseInt(String(limitParam), 10) : 50;
  const offset = offsetParam ? parseInt(String(offsetParam), 10) : 0;

  // Validate API key
  const providedKey = extractApiKey(req.headers, queryApiKey);
  const auth = validateLeadsApiKey(providedKey);

  if (!auth.authenticated) {
    res.statusCode = auth.statusCode || 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: auth.error }));
    return;
  }

  try {
    const bot = customBot || getChatbot();
    const leads = await bot.getLeads({ limit, offset });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        success: true,
        count: leads.length,
        leads,
      })
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: errorMessage }));
  }
}

/**
 * Web standard Request/Response handler for Next.js App Router (app/api/leads/route.ts)
 */
export async function handleLeadsWebRequest(
  request: Request,
  customBot?: Chatbot
): Promise<Response> {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-api-key",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "GET") {
    return new Response(
      JSON.stringify({ success: false, error: "Method Not Allowed. Use GET." }),
      { status: 405, headers }
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const offsetParam = url.searchParams.get("offset");
  const queryApiKey = url.searchParams.get("apiKey") || url.searchParams.get("key");

  const limit = limitParam ? parseInt(limitParam, 10) : 50;
  const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

  const providedKey = extractApiKey(request.headers, queryApiKey);
  const auth = validateLeadsApiKey(providedKey);

  if (!auth.authenticated) {
    return new Response(
      JSON.stringify({ success: false, error: auth.error }),
      { status: auth.statusCode || 401, headers }
    );
  }

  try {
    const bot = customBot || getChatbot();
    const leads = await bot.getLeads({ limit, offset });

    return new Response(
      JSON.stringify({
        success: true,
        count: leads.length,
        leads,
      }),
      { status: 200, headers }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers }
    );
  }
}

export default handleLeadsNodeHttp;
