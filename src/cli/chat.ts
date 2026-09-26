import readline from "readline";
import crypto from "crypto";
import { Chatbot } from "../core/chatbot.js";
import type { Message } from "../core/types.js";
import { chatbotConfig } from "../../config/chatbot.config.js";

async function main() {
  console.log("==================================================");
  console.log("🤖 AI Chatbot & Lead Generation Engine (CLI)");
  console.log(`📌 Active Mode: [${chatbotConfig.mode.toUpperCase()}]`);
  console.log(`⚡ LLM Model: ${chatbotConfig.llm.model}`);
  console.log(`🏢 Context: ${chatbotConfig.contextFilePath}`);
  console.log('Type "exit" or "quit" to stop. Type "clear" to reset session.');
  console.log("==================================================\n");

  let chatbot: Chatbot;

  try {
    chatbot = new Chatbot();
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`\n❌ Initialization Error: ${errorMsg}\n`);
    console.error("Tip: Ensure GROQ_API_KEY is defined in your .env file.");
    process.exit(1);
  }

  const sessionId = `cli-${crypto.randomUUID().slice(0, 8)}`;
  let history: Message[] = [];

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const promptUser = () => {
    rl.question("\nYou: ", async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        promptUser();
        return;
      }

      if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
        console.log("\n👋 Goodbye!\n");
        rl.close();
        process.exit(0);
      }

      if (trimmed.toLowerCase() === "clear") {
        history = [];
        console.log("\n🧹 Conversation session cleared.\n");
        promptUser();
        return;
      }

      try {
        const result = await chatbot.chat({
          message: trimmed,
          history,
          sessionId,
        });

        console.log(`\nBot: ${result.message}`);

        if (result.lead?.status === "created" && result.lead.id) {
          console.log(`\n✨ [Lead created successfully in Firestore: ID ${result.lead.id}]`);
        } else if (result.lead?.status === "collecting") {
          // Subtle CLI indicator that lead info is in progress
          // (optional, keeping output clean)
        }

        // Keep transient conversation history in memory for next turns
        history.push({ role: "user", content: trimmed });
        history.push({ role: "assistant", content: result.message });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`\n⚠️  Error: ${message}`);
      }

      promptUser();
    });
  };

  promptUser();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
