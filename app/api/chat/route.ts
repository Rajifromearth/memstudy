import { createGroq } from "@ai-sdk/groq";
import { MemForksClient } from "@memfork/core";
import { type Message } from "ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { messages, branch = "main" }: { messages: Message[]; branch: string } =
      await req.json();

    
    let memforks: any = null;
    try {
      memforks = await MemForksClient.connect({
        treeId: process.env.MEMFORK_TREE_ID!,
        signer: process.env.MEMFORK_PRIVATE_KEY!,
        memwal: {
          accountId: process.env.MEMFORK_MEMWAL_ACCOUNT!,
          delegateKey: process.env.MEMFORK_MEMWAL_KEY!,
          serverUrl: process.env.MEMFORK_RELAYER_URL,
        },
      });
    } catch (e) {
      console.log("MemForks connect skipped:", e);
    }

    
    let memoryContext = "";
    if (memforks) {
      try {
        const memories = await memforks.recall(branch, { limit: 5 });
        if (memories?.length > 0) {
          memoryContext = "\n\nPast session memory:\n" +
            memories.map((m: any) => m.content ?? m).join("\n");
        }
      } catch (e) {
        console.log("Recall skipped:", e);
      }
    }

    const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

    const response = await (groq("llama-3.1-8b-instant") as any).doStream({
      inputFormat: "messages",
      mode: { type: "regular" },
      prompt: [
        {
          role: "system" as const,
          content: `You are StudyMind, a personal AI study assistant.
The student is on the "${branch}" subject branch.
Be clear, patient and thorough. Show step-by-step working for math and physics.
After answering, suggest one follow-up question.${memoryContext}`,
        },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: [{ type: "text" as const, text: m.content as string }],
        })),
      ],
    }); 

    let fullText = "";
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response.stream) {
          if (chunk.type === "text-delta") {
            fullText += chunk.delta;
            controller.enqueue(new TextEncoder().encode(chunk.delta));
          }
        }
        controller.close();

        
        if (memforks) {
          try {
            const lastUserMsg = messages[messages.length - 1];
            await memforks.commit(branch, {
              message: `User: ${lastUserMsg.content}\nAssistant: ${fullText}`,
            });
            console.log("Memory committed to branch:", branch);
          } catch (e) {
            console.log("Commit skipped:", e);
          }
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (err) {
    console.error("ROUTE ERROR:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}