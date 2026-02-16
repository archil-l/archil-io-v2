import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { Request, Response } from "express";
import { serverTools } from "./tools";
import { buildSystemPrompt } from "./system-prompt";
import { validateTurnstileToken, extractClientIp } from "./turnstile";

const MODEL = "claude-3-5-haiku-latest";

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Helper function to get user-friendly error messages
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for status code in error object (Anthropic SDK errors)
    const errorObj = error as any;
    const statusCode = errorObj.statusCode;

    // Anthropic SDK specific errors
    if (
      message.includes("invalid_api_key") ||
      message.includes("invalid x-api-key") ||
      statusCode === 401
    ) {
      return "Authentication failed. Please check API configuration.";
    }
    if (message.includes("rate_limit") || statusCode === 429) {
      return "Service is busy. Please try again in a moment.";
    }
    if (message.includes("model_not_found") || statusCode === 404) {
      return "Model not available. Please try again later.";
    }
    if (message.includes("timeout") || message.includes("timed out")) {
      return "Request timed out. Please try again.";
    }
    if (
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("connection")
    ) {
      return "Network error. Please check your connection and try again.";
    }
    if (message.includes("overloaded") || statusCode === 503) {
      return "Service is temporarily overloaded. Please try again later.";
    }
    if (message.includes("billing") || message.includes("quota")) {
      return "Service quota exceeded. Please try again later.";
    }

    // Generic error message with details
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

// Helper function to send error as SSE format (for streaming responses)
function sendStreamError(res: Response, errorMessage: string): void {
  const errorEvent = `data: ${JSON.stringify({
    type: "error",
    error: errorMessage,
  })}\n\n`;

  if (!res.headersSent) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
  }

  res.write(errorEvent);
  res.end();
}

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

    let result;
    try {
      // Wrap streamText call to catch LLM provider errors
      result = streamText({
        model: anthropic(MODEL),
        system: buildSystemPrompt(),
        messages: modelMessages,
        tools: serverTools,
      });
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error("LLM provider error:", error);
      res.status(500).json({ error: errorMessage });
      return;
    }

    let response;
    try {
      response = result.toUIMessageStreamResponse();
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error("Failed to create response stream:", error);
      res.status(500).json({ error: errorMessage });
      return;
    }

    // Set headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Get the readable stream and pipe it
    const reader = response.body?.getReader();
    if (!reader) {
      sendStreamError(res, "Failed to create response stream");
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
        console.error("Stream read error:", error);
        const errorMessage = getErrorMessage(error);
        // Send error as SSE format if headers were already sent
        if (res.headersSent) {
          sendStreamError(res, errorMessage);
        } else {
          res.status(500).json({ error: errorMessage });
        }
      }
    };

    // Await pump to ensure errors are caught
    await pump().catch((error) => {
      console.error("Unhandled pump error:", error);
      const errorMessage = getErrorMessage(error);
      if (!res.headersSent) {
        res.status(500).json({ error: errorMessage });
      } else {
        res.end();
      }
    });
  } catch (error) {
    console.error("Agent request error:", error);
    const errorMessage = getErrorMessage(error);
    res.status(500).json({ error: errorMessage });
  }
}
