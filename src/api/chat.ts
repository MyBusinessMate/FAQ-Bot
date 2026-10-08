import type { IncomingMessage, ServerResponse } from "http";
import { Chatbot } from "../core/chatbot.js";
import type { ChatInput } from "../core/types.js";

let sharedBotInstance: Chatbot | null = null;
function getChatbot(): Chatbot {
  if (!sharedBotInstance) {
    sharedBotInstance = new Chatbot();
  }
  return sharedBotInstance;
}

/**
 * Node.js / Express / Next.js Pages Router compatible handler for POST /api/chat
 */
export async function handleChatNodeHttp(
  req: IncomingMessage & { body?: any },
  res: ServerResponse,
  customBot?: Chatbot
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method Not Allowed. Use POST." }));
    return;
  }

  let body = req.body;
  if (!body) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    body = raw ? JSON.parse(raw) : {};
  }

  const { message, history, sessionId } = (body || {}) as ChatInput;
  if (!message || typeof message !== "string") {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: 'Field "message" is required and must be a string.' }));
    return;
  }

  try {
    const bot = customBot || getChatbot();
    const result = await bot.chat({ message, history, sessionId });
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: errorMessage }));
  }
}

/**
 * Web standard Request/Response handler for Next.js App Router (app/api/chat/route.ts)
 */
export async function handleChatWebRequest(
  request: Request,
  customBot?: Chatbot
): Promise<Response> {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed. Use POST." }),
      { status: 405, headers }
    );
  }

  try {
    const body = (await request.json()) as ChatInput;
    const { message, history, sessionId } = body || {};

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: 'Field "message" is required and must be a string.' }),
        { status: 400, headers }
      );
    }

    const bot = customBot || getChatbot();
    const result = await bot.chat({ message, history, sessionId });

    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers }
    );
  }
}

export default handleChatNodeHttp;
