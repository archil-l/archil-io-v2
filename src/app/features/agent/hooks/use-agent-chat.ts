import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect } from "react";
import { useThemeContext } from "~/contexts/theme-context";
import type { SetThemeInput, CopyToClipboardInput } from "../tools/client";

import type { ToolUIPart } from "ai";

interface UseAgentChatOptions {
  initialMessages?: UIMessage[];
  onThemeChange?: (theme: "light" | "dark") => void;
  onCopySuccess?: (label?: string) => void;
  streamingEndpoint: string;
  token: string;
}

interface UseAgentChatReturn extends ReturnType<typeof useChat> {
  isLoading: boolean;
  toolCalls?: ToolUIPart[];
}

export const useAgentChat = (
  options: UseAgentChatOptions,
): UseAgentChatReturn => {
  const { theme, toggleTheme } = useThemeContext();
  const {
    onThemeChange,
    onCopySuccess,
    initialMessages,
    streamingEndpoint,
    token,
  } = options;

  // Keep theme ref for use in callbacks
  const themeRef = useRef(theme);

  // Keep theme ref updated
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Build transport config with streaming endpoint and JWT token
  const transportConfig = {
    api: streamingEndpoint,
    headers: { Authorization: `Bearer ${token}` },
  };

  const chat = useChat({
    transport: new DefaultChatTransport(transportConfig),
    messages: initialMessages,
    onToolCall: async ({ toolCall }) => {
      const toolName = toolCall.toolName;
      const toolCallId = toolCall.toolCallId;

      switch (toolName) {
        case "setTheme": {
          const input = toolCall.input as SetThemeInput;
          let newTheme: "light" | "dark";

          console.log(`[setTheme] Tool called with input:`, input);
          console.log(`[setTheme] Current theme in ref: ${themeRef.current}`);

          if (input.theme === "toggle") {
            newTheme = themeRef.current === "light" ? "dark" : "light";
            console.log(`[setTheme] Toggling theme to: ${newTheme}`);
            toggleTheme();
          } else {
            newTheme = input.theme;
            console.log(`[setTheme] Setting theme to: ${newTheme}`);
            if (newTheme !== themeRef.current) {
              console.log(`[setTheme] Calling toggleTheme()`);
              toggleTheme();
            } else {
              console.log(
                `[setTheme] Theme already ${newTheme}, skipping toggle`,
              );
            }
          }

          console.log(`[setTheme] Final theme: ${newTheme}`);
          onThemeChange?.(newTheme);

          // Add tool output with the result
          console.log(`[setTheme] Adding tool output with theme: ${newTheme}`);
          chat.addToolOutput({
            tool: toolName,
            toolCallId,
            output: { success: true, currentTheme: newTheme },
          });
          console.log(`[setTheme] Tool execution completed`);
          break;
        }

        case "copyToClipboard": {
          const input = toolCall.input as CopyToClipboardInput;
          try {
            await navigator.clipboard.writeText(input.text);
            onCopySuccess?.(input.label);
            chat.addToolOutput({
              tool: toolName,
              toolCallId,
              output: {
                success: true,
                message: input.label
                  ? `Copied ${input.label} to clipboard`
                  : "Copied to clipboard",
              },
            });
          } catch {
            chat.addToolOutput({
              tool: toolName,
              toolCallId,
              state: "output-error",
              errorText: "Failed to copy to clipboard",
            });
          }
          break;
        }
      }
    },
  });

  // Extract tool calls from messages
  const toolCalls: ToolUIPart[] = [];
  for (const msg of chat.messages) {
    if (msg.parts) {
      for (const part of msg.parts) {
        if (part.type === "tool-call" || part.type === "tool-result") {
          toolCalls.push(part as ToolUIPart);
        }
      }
    }
  }

  return {
    ...chat,
    isLoading: chat.status === "streaming" || chat.status === "submitted",
    toolCalls,
  };
};
