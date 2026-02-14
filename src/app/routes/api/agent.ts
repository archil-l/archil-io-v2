import { handleAgentRequest } from "~/server/agent/chat-handler";
import type { ActionFunction } from "react-router";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Parse the request body
    const body = await request.json();

    // Create a mock Express request object with the parsed body
    const expressReq = {
      body,
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      url: request.url,
    } as any;

    // Track response state
    const responseState = {
      statusCode: 200,
      headers: {} as Record<string, string>,
      chunks: [] as Uint8Array[],
      ended: false,
    };

    // Create a mock Express response object
    const expressRes = {
      statusCode: 200,
      status: (code: number) => {
        responseState.statusCode = code;
        return expressRes;
      },
      setHeader: (key: string, value: string) => {
        responseState.headers[key] = value;
        return expressRes;
      },
      write: (chunk: any) => {
        if (typeof chunk === "string") {
          responseState.chunks.push(new TextEncoder().encode(chunk));
        } else if (chunk instanceof Uint8Array) {
          responseState.chunks.push(chunk);
        }
        return true;
      },
      end: () => {
        responseState.ended = true;
      },
      json: (data: any) => {
        const json = JSON.stringify(data);
        responseState.chunks.push(new TextEncoder().encode(json));
        return expressRes;
      },
    } as any;

    // Call the handler
    await handleAgentRequest(expressReq, expressRes);

    // Combine all chunks into a single response
    const decoder = new TextDecoder();
    const responseBody = responseState.chunks
      .map((chunk) => decoder.decode(chunk, { stream: true }))
      .join("");

    return new Response(responseBody, {
      status: responseState.statusCode,
      headers: responseState.headers,
    });
  } catch (error) {
    console.error("Agent request error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
