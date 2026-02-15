import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
} from "react";
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
  handleRetryMessage: (messageId: string) => void;
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
function toMessageType(
  msg: UIMessage,
  status?: "pending" | "sent" | "error",
  error?: string,
): MessageType {
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
    status,
    error,
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
    error: globalError,
  } = useAgentChat({
    initialMessages: aiInitialMessages,
  });

  // Track message errors
  const [messageErrors, setMessageErrors] = useState<Record<string, string>>(
    {},
  );
  const [failedMessageIds, setFailedMessageIds] = useState<Set<string>>(
    new Set(),
  );

  // Convert AI messages to our format for display with error tracking
  const messages: MessageType[] = aiMessages.map((msg, index) => {
    const msgError = messageErrors[msg.id];
    let status: "pending" | "sent" | "error" | undefined;

    // Determine message status
    if (failedMessageIds.has(msg.id)) {
      status = "error";
    } else if (
      isLoading &&
      index === aiMessages.length - 1 &&
      msg.role === "user"
    ) {
      status = "pending";
    } else if (msg.role === "user") {
      status = "sent";
    }

    return toMessageType(msg, status, msgError);
  });

  // Track errors from the global error state
  useEffect(() => {
    if (globalError && aiMessages.length > 0) {
      // Find last user message
      let lastUserMessage;
      for (let i = aiMessages.length - 1; i >= 0; i--) {
        if (aiMessages[i].role === "user") {
          lastUserMessage = aiMessages[i];
          break;
        }
      }
      if (lastUserMessage) {
        setMessageErrors((prev) => ({
          ...prev,
          [lastUserMessage.id]:
            globalError instanceof Error
              ? globalError.message
              : String(globalError),
        }));
        setFailedMessageIds((prev) => new Set([...prev, lastUserMessage.id]));
      }
    }
  }, [globalError, aiMessages]);

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

  const handleRetryMessage = useCallback(
    (messageId: string) => {
      const failedMessage = aiMessages.find(
        (msg) => msg.id === messageId && msg.role === "user",
      );
      if (failedMessage) {
        // Extract text content from the message
        const textParts = failedMessage.parts.filter(
          (p): p is { type: "text"; text: string } => p.type === "text",
        );
        const textContent = textParts.map((p) => p.text).join("");

        // Clear the error state for this message
        setMessageErrors((prev) => {
          const updated = { ...prev };
          delete updated[messageId];
          return updated;
        });
        setFailedMessageIds((prev) => {
          const updated = new Set(prev);
          updated.delete(messageId);
          return updated;
        });

        // Resend the message
        sendMessage({
          text: textContent,
          metadata: { captchaToken: undefined },
        });
      }
    },
    [aiMessages, sendMessage],
  );

  const handleClearConversation = useCallback(() => {
    clearConversation();
    setAIMessages([toAIMessage(INITIAL_WELCOME_MESSAGE)]);
    setMessageErrors({});
    setFailedMessageIds(new Set());
  }, [setAIMessages]);

  return (
    <ConversationContext.Provider
      value={{
        messages,
        isLoading,
        error: globalError,
        handleSubmit,
        handleRetryMessage,
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
