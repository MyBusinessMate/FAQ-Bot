# AI Chatbot & Lead Generation Engine — Complete Integration Guide

This guide provides a step-by-step blueprint for integrating the reusable TypeScript AI Chatbot & Lead Generation Engine (powered by Groq and Firebase) into **ANY** web application or backend service (React + Vite, Next.js, Remix, Astro, TanStack Start, Node/Express, etc.).

---

## 1. Engine Architecture & Overview

The chatbot engine is **100% framework-independent** pure TypeScript with zero UI dependencies.

```
your-project/
├── chatbot/
│   ├── config/
│   │   └── chatbot.config.ts    # Model settings, operating mode, lead required fields
│   ├── context/
│   │   └── context.md           # Business profile, services/products, FAQs, lead goals
│   └── src/
│       ├── core/
│       │   ├── chatbot.ts       # Main orchestrator class
│       │   ├── context.ts       # Dynamic ContextLoader from context.md
│       │   ├── prompt.ts        # System prompt and message history builder
│       │   └── types.ts         # Domain types and interfaces
│       ├── database/
│       │   └── firebase.ts      # Optional Firestore initialization for lead persistence
│       ├── leads/
│       │   ├── extractor.ts     # Structured JSON extraction of name, phone, email, requirements
│       │   ├── repository.ts    # Firestore & In-Memory Lead repositories
│       │   └── validator.ts     # Input validation for phone, email, names
│       ├── llm/
│       │   ├── groq.ts          # High-speed Groq SDK LLM integration
│       │   └── provider.ts      # Pluggable LLMProvider interface & error handling
│       ├── modes/
│       │   ├── lead.ts          # Conversational sales & structured lead capture mode
│       │   └── normal.ts        # Strictly informational Q&A mode
│       └── cli/
│           └── chat.ts          # Interactive terminal chat testing tool
├── api/
│   └── chat.ts                  # Serverless API route / Dev server middleware
└── src/
    └── components/
        └── ChatbotWidget.tsx    # (Optional) Frontend floating chat widget
```

---

## 2. Package Manager Support (`npm`, `pnpm`, `yarn`, `bun`)

You can install dependencies using whatever package manager your host project uses:

### npm:
```bash
npm install groq-sdk dotenv firebase-admin
```

### pnpm:
```bash
pnpm add groq-sdk dotenv firebase-admin
```

### yarn:
```bash
yarn add groq-sdk dotenv firebase-admin
```

### bun:
```bash
bun add groq-sdk dotenv firebase-admin
```

> **Note:** `firebase-admin` is optional. If Firebase credentials are not provided in `.env`, the engine automatically falls back to `InMemoryLeadRepository` without throwing errors.

---

## 3. Step-by-Step Setup in Any Project

### Step 1: Copy the `chatbot/` Folder
Copy the `chatbot/` directory (excluding any `node_modules` or lockfiles) into your project root:
```bash
cp -r /path/to/chatbot/ ./chatbot/
```

### Step 2: Install Required Dependencies
Run `npm install groq-sdk dotenv firebase-admin` (or using `pnpm` / `yarn` / `bun`).

### Step 3: Customize `chatbot/context/context.md`
Provide the exact business details and lead goals for your business:
```markdown
# Business Profile — [Company / Brand Name]

Name: [Company Name]
Industry: [e.g. Web Development / E-Commerce / Consulting / Real Estate]
Location: [City, State, Country]
Contact Email: [contact@yourcompany.com]
Contact Phone: [+1 555-0100 / +91 xxxxx xxxxx]
Business Hours: [Mon – Fri: 9:00 AM – 6:00 PM]

## About [Company Name]
[1-2 sentences describing the company, history, and core mission.]

## Services & Offerings
1. **[Service / Product A]**: [Key features, scope, details]
2. **[Service / Product B]**: [Key features, scope, details]
3. **[Service / Product C]**: [Key features, scope, details]

## Pricing & Packages
- **[Starter Tier]**: [Pricing details or starting range]
- **[Custom Tier]**: [Custom quote based on client scope]

## Delivery & Turnaround / FAQs
**Q: What is your standard turnaround time?**
A: [Concise answer, e.g. Standard projects take 2–4 weeks.]

**Q: How do we get started?**
A: [Concise answer, e.g. Share your requirements here or schedule a discovery call.]

## Lead Information
For potential clients or customers, collect:
- name
- phone (or email)
- requirements (e.g. project type, preferred timeline, budget)
```

### Step 4: Configure `chatbot/config/chatbot.config.ts`
Adjust behavior and required lead fields:
```typescript
export const chatbotConfig = {
  // "lead" collects customer info; "normal" only answers questions
  mode: (process.env.CHATBOT_MODE as "normal" | "lead") || "lead",

  responseStyle: {
    concise: true,
    maxSentences: 3,
  },

  lead: {
    enabled: true,
    // Fields required before a lead is marked as ready and saved
    requiredFields: process.env.CHATBOT_REQUIRED_FIELDS
      ? process.env.CHATBOT_REQUIRED_FIELDS.split(",").map((s) => s.trim())
      : ["name", "phone"],
  },

  llm: {
    provider: "groq",
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    apiKey: process.env.GROQ_API_KEY,
    temperature: 0.2,
    maxTokens: 500,
  },

  contextFilePath: process.env.CHATBOT_CONTEXT_PATH || "chatbot/context/context.md",
};
```

### Step 5: Add Environment Variables to `.env`
Add these keys to your `.env` file:
```env
# Groq API Configuration (Get your API key at https://console.groq.com)
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

# Mode ("lead" or "normal")
CHATBOT_MODE=lead

# Optional: Firestore credentials for saving leads (Leave blank to use in-memory storage)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

---

## 4. Backend API Integration Patterns

### Pattern A: Vite / Single Page Apps (Dev Server Middleware + Serverless Function)

1. **Create `api/chat.ts`**:
```typescript
import type { IncomingMessage, ServerResponse } from 'http';
import { Chatbot } from '../chatbot/src/core/chatbot.js';

let chatbotInstance: Chatbot | null = null;
function getChatbot() {
  if (!chatbotInstance) chatbotInstance = new Chatbot();
  return chatbotInstance;
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed. Use POST.' }));
    return;
  }

  let body = req.body;
  if (!body) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    body = raw ? JSON.parse(raw) : {};
  }

  const { message, history, sessionId } = body || {};
  if (!message || typeof message !== 'string') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Field "message" is required.' }));
    return;
  }

  try {
    const bot = getChatbot();
    const result = await bot.chat({ message, history, sessionId });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Server error' }));
  }
}
```

2. **Hook into `vite.config.ts` dev server**:
```typescript
function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/chat')) {
          const { default: handler } = await import('./api/chat.js');
          return handler(req as any, res as any);
        }
        next();
      });
    },
  };
}
```

---

### Pattern B: Next.js App Router (`app/api/chat/route.ts`)
```typescript
import { NextRequest, NextResponse } from "next/server";
import { Chatbot } from "@/chatbot/src/core/chatbot";

const chatbot = new Chatbot();

export async function POST(req: NextRequest) {
  try {
    const { message, history, sessionId } = await req.json();
    const result = await chatbot.chat({ message, history, sessionId });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process message" },
      { status: 500 }
    );
  }
}
```

---

### Pattern C: Express / Node.js API Server
```typescript
import express from 'express';
import { Chatbot } from './chatbot/src/core/chatbot.js';

const app = express();
app.use(express.json());

const chatbot = new Chatbot();

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, sessionId } = req.body;
    const result = await chatbot.chat({ message, history, sessionId });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
});
```

---

## 5. Frontend React UI Integration

### Option 1: Reusable React Hook (`useChat`)
You can consume the API from any custom UI using this hook:

```typescript
import { useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => "session-" + Math.random().toString(36).substring(2, 9));
  const [leadStatus, setLeadStatus] = useState<"none" | "collecting" | "created">("none");

  async function sendMessage(userText: string) {
    const text = userText.trim();
    if (!text || isLoading) return;

    const updatedHistory: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(updatedHistory);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: updatedHistory,
          sessionId,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

      if (data.lead?.status) {
        setLeadStatus(data.lead.status);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I am having trouble connecting right now." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const clearChat = () => {
    setMessages([]);
    setLeadStatus("none");
  };

  return { messages, isLoading, leadStatus, sendMessage, clearChat };
}
```

---

## 6. How to Test Everything

### 1. Interactive Terminal CLI
Test back-and-forth conversation directly in the terminal before building any frontend:

Add to `package.json`:
```json
"scripts": {
  "chat": "tsx chatbot/src/cli/chat.ts"
}
```

Run:
```bash
npm run chat
```

### 2. Single-Prompt Terminal Test
Test the core LLM execution directly:
```bash
npx tsx -e "import { Chatbot } from './chatbot/src/core/chatbot.ts'; const bot = new Chatbot(); bot.chat({ message: 'What services do you offer?' }).then(console.log);"
```

### 3. Lead Capture Terminal Test
Test structured extraction and lead creation:
```bash
npx tsx -e "import { Chatbot } from './chatbot/src/core/chatbot.ts'; const bot = new Chatbot(); bot.chat({ message: 'Hi, my name is Alex, email is alex@example.com, and I need a custom web application.' }).then(console.log);"
```

### 4. API Endpoint Test (cURL)
Test your running server / API route:
```bash
curl -X POST http://localhost:5173/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello! Can you tell me about your pricing?"}'
```

---

## 7. Production Deployment Checklist
- [ ] Add `GROQ_API_KEY` to your production hosting environment variables (e.g., Vercel, Netlify, Railway, AWS).
- [ ] Set `CHATBOT_MODE=lead` (or `CHATBOT_MODE=normal`).
- [ ] (Optional) Add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` if storing leads in Firestore.
