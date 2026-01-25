import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { Request, Response } from "express";
import { serverTools } from "./tools";
import { buildSystemPrompt } from "./system-prompt";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function handleAgentRequest(req: Request, res: Response) {
  try {
    const { messages } = req.body as { messages: UIMessage[] };

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
      return;
    }

    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: buildSystemPrompt(),
      messages: modelMessages,
      tools: serverTools,
    });

    const response = result.toUIMessageStreamResponse();

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Get the readable stream and pipe it
    const reader = response.body?.getReader();
    if (!reader) {
      res.status(500).json({ error: "Failed to create stream" });
      return;
    }

    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(value);
        }
      } catch (error) {
        console.error("Stream error:", error);
        res.end();
      }
    };

    pump();
  } catch (error) {
    console.error("Agent request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
