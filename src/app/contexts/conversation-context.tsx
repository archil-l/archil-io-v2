import { createContext, useContext, useEffect, useCallback } from "react";
import {
  saveConversationHistory,
  clearConversation,
  type MessageType,
} from "~/lib/session";
import { useAgentChat } from "~/features/agent";
import { INITIAL_WELCOME_MESSAGE } from "~/features/welcome/constants";
import type { UIMessage } from "ai";

interface ConversationContextType {
  messages: MessageType[];
  isLoading: boolean;
  error: Error | undefined;
  handleSubmit: (message: { text?: string; captchaToken?: string }) => void;
  handleClearConversation: () => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(
  undefined,
);

// Convert our MessageType to AI SDK UIMessage format
function toAIMessage(msg: MessageType): UIMessage {
  return {
    id: msg.id,
    role: msg.role,
    parts: [{ type: "text", text: msg.content }],
  };
}

// Convert AI SDK UIMessage to our MessageType format
function toMessageType(msg: UIMessage): MessageType {
  // Extract text from parts
  const textParts = msg.parts.filter(
    (p): p is { type: "text"; text: string } => p.type === "text",
  );
  const textContent = textParts.map((p) => p.text).join("");

  return {
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: textContent,
    parts: [{ type: "text", text: textContent }],
  };
}

interface ConversationProviderProps {
  children: React.ReactNode;
  initialMessages?: MessageType[];
  isLoaded: boolean;
}

export function ConversationProvider({
  children,
  initialMessages = [],
  isLoaded,
}: ConversationProviderProps) {
  // Convert initial messages to AI SDK format
  const aiInitialMessages =
    initialMessages.length > 0
      ? initialMessages.map(toAIMessage)
      : [toAIMessage(INITIAL_WELCOME_MESSAGE)];

  const {
    messages: aiMessages,
    sendMessage,
    setMessages: setAIMessages,
    isLoading,
    error,
  } = useAgentChat({
    initialMessages: aiInitialMessages,
  });

  // Convert AI messages to our format for display
  const messages: MessageType[] = aiMessages.map(toMessageType);

  // Save conversation to localStorage whenever messages change (after initial load)
  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      saveConversationHistory(messages);
    }
  }, [messages, isLoaded]);

  const handleSubmit = useCallback(
    (message: { text?: string; captchaToken?: string }) => {
      if (!message.text?.trim()) return;
      sendMessage({
        text: message.text,
        metadata: { captchaToken: message.captchaToken },
      });
    },
    [sendMessage],
  );

  const handleClearConversation = useCallback(() => {
    clearConversation();
    setAIMessages([toAIMessage(INITIAL_WELCOME_MESSAGE)]);
  }, [setAIMessages]);

  return (
    <ConversationContext.Provider
      value={{
        messages,
        isLoading,
        error,
        handleSubmit,
        handleClearConversation,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversationContext() {
  const context = useContext(ConversationContext);

  if (context === undefined) {
    throw new Error(
      "useConversationContext must be used within a ConversationProvider",
    );
  }

  return context;
}
