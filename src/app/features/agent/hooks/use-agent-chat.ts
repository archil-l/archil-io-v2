import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect } from "react";
import { useThemeContext } from "~/contexts/theme-context";
import type { SetThemeInput, CopyToClipboardInput } from "../tools/client";

interface UseAgentChatOptions {
  initialMessages?: UIMessage[];
  onThemeChange?: (theme: "light" | "dark") => void;
  onCopySuccess?: (label?: string) => void;
  streamingEndpoint: string;
  token: string;
}

export function useAgentChat(options: UseAgentChatOptions) {
  const { theme, toggleTheme } = useThemeContext();
  const {
    onThemeChange,
    onCopySuccess,
    initialMessages,
    streamingEndpoint,
    token,
  } = options;

  // Store addToolOutput in a ref so we can access it in the callback
  const addToolOutputRef = useRef<typeof chat.addToolOutput | null>(null);
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
    onError: (error) => {
      console.error("[CHAT] Error:", error);
    },
    onFinish: (message) => {
      console.log(
        "[CHAT] onFinish - message:",
        JSON.stringify(message, null, 2),
      );
    },
    onToolCall: async ({ toolCall }) => {
      console.log("[CHAT] onToolCall:", JSON.stringify(toolCall, null, 2));
      // Skip dynamic tools
      if (toolCall.dynamic) return;

      const toolName = toolCall.toolName;
      const toolCallId = toolCall.toolCallId;

      switch (toolName) {
        case "setTheme": {
          const input = toolCall.input as SetThemeInput;
          let newTheme: "light" | "dark";

          if (input.theme === "toggle") {
            newTheme = themeRef.current === "light" ? "dark" : "light";
            toggleTheme();
          } else {
            newTheme = input.theme;
            if (newTheme !== themeRef.current) {
              toggleTheme();
            }
          }

          onThemeChange?.(newTheme);
          // Call addToolOutput without await to avoid deadlocks
          addToolOutputRef.current?.({
            tool: toolName,
            toolCallId,
            output: { success: true, currentTheme: newTheme },
          });
          break;
        }

        case "copyToClipboard": {
          const input = toolCall.input as CopyToClipboardInput;
          try {
            await navigator.clipboard.writeText(input.text);
            onCopySuccess?.(input.label);
            addToolOutputRef.current?.({
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
            addToolOutputRef.current?.({
              tool: toolName,
              toolCallId,
              output: { success: false, error: "Failed to copy to clipboard" },
            });
          }
          break;
        }
      }
    },
  });

  // Update the ref after chat is created
  addToolOutputRef.current = chat.addToolOutput;

  // Debug logging for status and messages
  useEffect(() => {
    console.log("[CHAT] Status changed:", chat.status);
  }, [chat.status]);

  useEffect(() => {
    console.log("[CHAT] Messages updated:", chat.messages.length, "messages");
    if (chat.messages.length > 0) {
      const lastMsg = chat.messages[chat.messages.length - 1];
      console.log("[CHAT] Last message:", JSON.stringify(lastMsg, null, 2));
    }
  }, [chat.messages]);

  return {
    ...chat,
    isLoading: chat.status === "streaming" || chat.status === "submitted",
  };
}
