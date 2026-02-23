import { useChat, UseChatHelpers } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect } from "react";
import { useThemeContext } from "~/contexts/theme-context";

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
  const { initialMessages, streamingEndpoint, token } = options;

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
        case "toggleTheme": {
          // Toggle the theme
          const previousTheme = themeRef.current;
          const newTheme = previousTheme === "light" ? "dark" : "light";
          toggleTheme();

          // Add tool output to complete the tool call
          chat.addToolOutput({
            tool: toolName,
            toolCallId,
            output: { toggled: true, previousTheme, newTheme },
          });
          console.log(`[toggleTheme] Tool execution completed`);
          break;
        }
      }
    },
  });

  return chat;
};
