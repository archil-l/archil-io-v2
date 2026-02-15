import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { Request, Response } from "express";
import { serverTools } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import { validateTurnstileToken, extractClientIp } from "./turnstile";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function handleAgentRequest(req: Request, res: Response) {
  try {
    const { messages } = req.body as {
      messages: UIMessage[];
    };

    if (!process.env.ANTHROPIC_API_KEY) {
      res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
      return;
    }

    // Extract and validate CAPTCHA token from the first message's metadata
    if (messages.length > 0) {
      const firstMessage = messages[0];
      const captchaToken = (firstMessage.metadata as Record<string, unknown>)
        ?.captchaToken as string | undefined;

      if (captchaToken) {
        const clientIp = extractClientIp(req.headers);
        const validation = await validateTurnstileToken(captchaToken, clientIp);

        if (!validation.valid) {
          res.status(400).json({
            error: "CAPTCHA validation failed",
            details: validation.error,
          });
          return;
        }

        // Remove captchaToken from metadata before processing
        if (firstMessage.metadata) {
          const newMetadata = { ...firstMessage.metadata };
          delete (newMetadata as Record<string, unknown>).captchaToken;
          firstMessage.metadata = newMetadata;
        }
      }
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
        // Write error to client if headers haven't been sent
        if (!res.headersSent) {
          res.status(500).json({ error: "Stream error occurred" });
        }
        res.end();
      }
    };

    pump();
  } catch (error) {
    console.error("Agent request error:", error);

    // Provide more helpful error messages
    let errorMessage = "Failed to process your request";
    if (error instanceof Error) {
      if (error.message.includes("API")) {
        errorMessage = "API service unavailable";
      } else if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again";
      } else if (error.message.includes("network")) {
        errorMessage = "Network error. Please check your connection";
      } else {
        errorMessage = error.message;
      }
    }

    res.status(500).json({ error: errorMessage });
  }
}
