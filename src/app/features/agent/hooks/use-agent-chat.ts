import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useState } from "react";
import { useThemeContext } from "~/contexts/theme-context";
import type { SetThemeInput, CopyToClipboardInput } from "../tools/client";

interface UseAgentChatOptions {
  initialMessages?: UIMessage[];
  onThemeChange?: (theme: "light" | "dark") => void;
  onCopySuccess?: (label?: string) => void;
  streamingEndpoint?: string;
}

export function useAgentChat(options: UseAgentChatOptions = {}) {
  const { theme, toggleTheme } = useThemeContext();
  const { onThemeChange, onCopySuccess, initialMessages, streamingEndpoint } =
    options;
  const [token, setToken] = useState<string | null>(null);

  // Fetch JWT token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const response = await fetch("/api/jwt-token");
        if (!response.ok) {
          throw new Error("Failed to fetch JWT token");
        }
        const data = (await response.json()) as { token: string };
        setToken(data.token);
      } catch (error) {
        console.error("Failed to fetch JWT token:", error);
      }
    };

    fetchToken();
  }, []);

  // Store addToolOutput in a ref so we can access it in the callback
  const addToolOutputRef = useRef<typeof chat.addToolOutput | null>(null);
  const themeRef = useRef(theme);

  // Keep theme ref updated
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Streaming endpoint is required - throw error if not provided
  if (!streamingEndpoint) {
    throw new Error(
      "Streaming endpoint is required. LLM_STREAM_URL environment variable must be set.",
    );
  }

  // Build transport config with streaming endpoint and JWT token
  const transportConfig = {
    api: streamingEndpoint,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };

  const chat = useChat({
    transport: new DefaultChatTransport(transportConfig),
    messages: initialMessages,
    onToolCall: async ({ toolCall }) => {
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

  return {
    ...chat,
    isLoading: chat.status === "streaming" || chat.status === "submitted",
  };
}
