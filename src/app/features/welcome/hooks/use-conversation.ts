import { useEffect, useCallback } from "react";
import {
  saveConversationHistory,
  clearConversation,
  type MessageType,
} from "~/lib/session";
import { useAgentChat } from "~/features/agent";
import { INITIAL_WELCOME_MESSAGE } from "../constants";
import type { UIMessage } from "ai";

interface UseConversationProps {
  initialMessages?: MessageType[];
  isLoaded: boolean;
}

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
    (p): p is { type: "text"; text: string } => p.type === "text"
  );
  const textContent = textParts.map((p) => p.text).join("");

  return {
    id: msg.id,
    role: msg.role as "user" | "assistant",
    content: textContent,
    parts: [{ type: "text", text: textContent }],
  };
}

export function useConversation({
  initialMessages = [],
  isLoaded,
}: UseConversationProps) {
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
    (message: { text?: string }) => {
      if (!message.text?.trim()) return;
      sendMessage({ text: message.text });
    },
    [sendMessage]
  );

  const handleClearConversation = useCallback(() => {
    clearConversation();
    setAIMessages([toAIMessage(INITIAL_WELCOME_MESSAGE)]);
  }, [setAIMessages]);

  return {
    messages,
    isLoading,
    error,
    handleSubmit,
    handleClearConversation,
  };
}
