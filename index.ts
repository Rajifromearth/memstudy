import { openai } from "@ai-sdk/openai";
import { streamText, type Message } from "ai";
import { withMemForks } from "@memfork/vercel-ai";

export async function POST(req: Request) {
  const { messages, branch = "main" }: { messages: Message[]; branch: string } =
    await req.json();

  const model = withMemForks(openai("gpt-4o-mini"), {
    treeId: process.env.MEMFORK_TREE_ID!,
    signer: process.env.MEMFORK_PRIVATE_KEY!,
    memwal: {
      accountId: process.env.MEMFORK_MEMWAL_ACCOUNT!,
      delegateKey: process.env.MEMFORK_MEMWAL_KEY!,
      serverUrl: process.env.MEMFORK_RELAYER_URL,
    },
    branch,
    recallLimit: 5,
    autoCommit: true,
  });

  const result = streamText({
    model,
    system: `You are StudyMind, a personal AI study assistant.
The student is currently on the "${branch}" subject branch.
You have access to memory from past sessions on this branch — use it to build on what was already covered.
Be clear, patient and thorough. Use examples and analogies.
For math and physics, show step-by-step working.
After answering, suggest one follow-up question to keep momentum.`,
    messages,
  });

  return result.toDataStreamResponse();
}