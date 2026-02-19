import { useChat, UseChatHelpers } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect } from "react";
import { useThemeContext } from "~/contexts/theme-context";
import type { SetThemeInput } from "../tools/client";

import { AgentUIMessage } from "~/lib/message-schema";

interface UseAgentChatOptions {
  initialMessages?: AgentUIMessage[];
  onThemeChange?: (theme: "light" | "dark") => void;
  onCopySuccess?: (label?: string) => void;
  streamingEndpoint: string;
  token: string;
}

export const useAgentChat = (
  options: UseAgentChatOptions,
): UseChatHelpers<AgentUIMessage> => {
  const { theme, toggleTheme } = useThemeContext();
  const { onThemeChange, initialMessages, streamingEndpoint, token } = options;

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
      }
    },
  });

  return chat;
};
