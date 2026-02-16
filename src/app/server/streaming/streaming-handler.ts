import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageStreamEvent,
  ContentBlockDeltaEvent,
  Tool,
  ToolResultBlockParam,
  MessageParam,
} from "@anthropic-ai/sdk/resources/messages";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { readKnowledge } from "../agent/tools/read-knowledge";
import { buildSystemPrompt } from "../agent/system-prompt";
import { verifyAuthHeader } from "../auth/jwt-verifier.js";

const MODEL = "claude-3-5-haiku-latest";

// Secrets Manager client for JWT secret retrieval
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Fetch JWT signing secret from AWS Secrets Manager
 */
async function fetchJWTSecret(): Promise<string> {
  try {
    const secretArn = process.env.JWT_SECRET_ARN;
    if (!secretArn) {
      throw new Error("JWT_SECRET_ARN environment variable is not set");
    }

    const command = new GetSecretValueCommand({
      SecretId: secretArn,
    });
    const response = await secretsClient.send(command);

    if (response.SecretString) {
      const secretJson = JSON.parse(response.SecretString);
      return secretJson.secret;
    }

    throw new Error("Secret does not have a SecretString");
  } catch (error) {
    console.error("Failed to fetch JWT secret:", error);
    throw error;
  }
}

// Define Anthropic tools from our server tools
const anthropicTools: Tool[] = [
  {
    name: "getContactInfo",
    description:
      "Get contact information including email, social links, and website",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "getExperience",
    description: "Get work history and career information",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "getTechnologies",
    description: "Get technical skills and technologies used",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// Execute a tool and return the result
function executeTool(toolName: string): string {
  switch (toolName) {
    case "getContactInfo":
      return readKnowledge("contact.md");
    case "getExperience":
      return readKnowledge("experience.md");
    case "getTechnologies":
      return readKnowledge("technologies.md");
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

// Format SSE event
function formatSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Lambda streaming types
interface StreamingEvent {
  body?: string;
  headers?: Record<string, string>;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
}

interface ResponseStream extends NodeJS.WritableStream {
  setContentType(contentType: string): void;
}

interface HttpResponseStreamMetadata {
  statusCode: number;
  headers: Record<string, string>;
}

// AWS Lambda streaming response helper
declare const awslambda: {
  streamifyResponse: (
    handler: (
      event: StreamingEvent,
      responseStream: ResponseStream,
      context: unknown,
    ) => Promise<void>,
  ) => (event: StreamingEvent, context: unknown) => Promise<void>;
  HttpResponseStream: {
    from: (
      responseStream: ResponseStream,
      metadata: HttpResponseStreamMetadata,
    ) => ResponseStream;
  };
};

export const handler = awslambda.streamifyResponse(
  async (
    event: StreamingEvent,
    responseStream: ResponseStream,
    _context: unknown,
  ) => {
    // Handle CORS preflight
    if (event.requestContext?.http?.method === "OPTIONS") {
      responseStream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
      responseStream.end();
      return;
    }

    try {
      // Verify JWT token from Authorization header
      const jwtSecret = await fetchJWTSecret();
      const verificationResult = verifyAuthHeader(
        event.headers || {},
        jwtSecret,
      );

      if (!verificationResult) {
        responseStream = awslambda.HttpResponseStream.from(responseStream, {
          statusCode: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
        responseStream.write(
          JSON.stringify({ error: "Missing Authorization header" }),
        );
        responseStream.end();
        return;
      }

      if (!verificationResult.valid) {
        responseStream = awslambda.HttpResponseStream.from(responseStream, {
          statusCode: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
        responseStream.write(
          JSON.stringify({
            error: verificationResult.error || "Unauthorized",
          }),
        );
        responseStream.end();
        return;
      }

      // Parse request body
      const body = event.body ? JSON.parse(event.body) : {};
      const { messages: inputMessages } = body as { messages?: MessageParam[] };

      if (!inputMessages || !Array.isArray(inputMessages)) {
        responseStream = awslambda.HttpResponseStream.from(responseStream, {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
        responseStream.write(
          JSON.stringify({ error: "messages array is required" }),
        );
        responseStream.end();
        return;
      }

      // Check for API key
      if (!process.env.ANTHROPIC_API_KEY) {
        responseStream = awslambda.HttpResponseStream.from(responseStream, {
          statusCode: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
        responseStream.write(
          JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        );
        responseStream.end();
        return;
      }

      // Set up streaming response
      responseStream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });

      // Create Anthropic client
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      // Track conversation messages for tool use loops
      let messages: MessageParam[] = [...inputMessages];
      let continueLoop = true;

      while (continueLoop) {
        continueLoop = false;

        // Create streaming message
        const stream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 4096,
          system: buildSystemPrompt(),
          messages,
          tools: anthropicTools,
        });

        // Track tool uses in this response
        const toolUses: Array<{
          id: string;
          name: string;
          input: Record<string, unknown>;
        }> = [];
        let currentToolUse: { id: string; name: string; input: string } | null =
          null;

        // Stream events to client
        for await (const event of stream) {
          const streamEvent = event as MessageStreamEvent;

          switch (streamEvent.type) {
            case "content_block_start":
              if (streamEvent.content_block.type === "text") {
                responseStream.write(
                  formatSSE("content_block_start", {
                    type: "text",
                    index: streamEvent.index,
                  }),
                );
              } else if (streamEvent.content_block.type === "tool_use") {
                currentToolUse = {
                  id: streamEvent.content_block.id,
                  name: streamEvent.content_block.name,
                  input: "",
                };
                responseStream.write(
                  formatSSE("tool_use_start", {
                    id: streamEvent.content_block.id,
                    name: streamEvent.content_block.name,
                  }),
                );
              }
              break;

            case "content_block_delta": {
              const deltaEvent = streamEvent as ContentBlockDeltaEvent;
              if (deltaEvent.delta.type === "text_delta") {
                responseStream.write(
                  formatSSE("text_delta", {
                    text: deltaEvent.delta.text,
                  }),
                );
              } else if (deltaEvent.delta.type === "input_json_delta") {
                if (currentToolUse) {
                  currentToolUse.input += deltaEvent.delta.partial_json;
                }
              }
              break;
            }

            case "content_block_stop":
              if (currentToolUse) {
                try {
                  const parsedInput = currentToolUse.input
                    ? JSON.parse(currentToolUse.input)
                    : {};
                  toolUses.push({
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input: parsedInput,
                  });
                } catch {
                  toolUses.push({
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input: {},
                  });
                }
                currentToolUse = null;
              }
              responseStream.write(formatSSE("content_block_stop", {}));
              break;

            case "message_stop":
              // Check if we need to handle tool results
              if (toolUses.length > 0) {
                // Execute tools and prepare results
                const toolResults: ToolResultBlockParam[] = toolUses.map(
                  (toolUse) => {
                    const result = executeTool(toolUse.name);
                    responseStream.write(
                      formatSSE("tool_result", {
                        tool_use_id: toolUse.id,
                        result,
                      }),
                    );
                    return {
                      type: "tool_result" as const,
                      tool_use_id: toolUse.id,
                      content: result,
                    };
                  },
                );

                // Add assistant message with tool uses and user message with results
                const assistantMessage = await stream.finalMessage();
                messages = [
                  ...messages,
                  { role: "assistant", content: assistantMessage.content },
                  { role: "user", content: toolResults },
                ];

                // Continue the loop to get the model's response to tool results
                continueLoop = true;
              } else {
                responseStream.write(formatSSE("message_stop", {}));
              }
              break;

            case "message_start":
              responseStream.write(
                formatSSE("message_start", {
                  id: streamEvent.message.id,
                  model: streamEvent.message.model,
                }),
              );
              break;
          }
        }
      }

      responseStream.write(formatSSE("done", {}));
      responseStream.end();
    } catch (error) {
      console.error("Streaming error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";

      // Try to send error if stream hasn't ended
      try {
        responseStream.write(formatSSE("error", { message: errorMessage }));
        responseStream.end();
      } catch {
        // Stream may already be closed
      }
    }
  },
);
