import { useEffect } from "react";
import {
  saveConversationHistory,
  clearConversation,
  type MessageType,
} from "~/lib/session";
import { INITIAL_WELCOME_MESSAGE } from "../constants";

interface UseConversationProps {
  messages: MessageType[];
  setMessages: React.Dispatch<React.SetStateAction<MessageType[]>>;
  isLoaded: boolean;
}

export function useConversation({
  messages,
  setMessages,
  isLoaded,
}: UseConversationProps) {
  // Save conversation to localStorage whenever messages change (after initial load)
  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      saveConversationHistory(messages);
    }
  }, [messages, isLoaded]);

  const handleSubmit = (message: { text?: string }) => {
    if (!message.text?.trim()) return;

    // Add user message
    const userMessage: MessageType = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message.text,
      parts: [{ type: "text", text: message.text }],
    };

    // Add mock AI response
    const aiResponse: MessageType = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content:
        "Thanks for your message! This is a mock response. The AI integration will be added later.",
      parts: [
        {
          type: "text",
          text: "Thanks for your message! This is a mock response. The AI integration will be added later.",
        },
      ],
    };

    setMessages((prev) => [...prev, userMessage, aiResponse]);
  };

  const handleClearConversation = () => {
    clearConversation();
    setMessages([INITIAL_WELCOME_MESSAGE]);
  };

  return {
    handleSubmit,
    handleClearConversation,
  };
}
