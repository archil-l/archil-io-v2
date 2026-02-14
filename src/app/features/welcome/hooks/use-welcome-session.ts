import { useState, useEffect } from "react";
import {
  getOrCreateSessionId,
  getConversationHistory,
  type MessageType,
} from "~/lib/session";
import { INITIAL_WELCOME_MESSAGE } from "../constants";

export function useWelcomeSession() {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<MessageType[]>([
    INITIAL_WELCOME_MESSAGE,
  ]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize session and load conversation history on mount
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);

    const history = getConversationHistory();
    if (history.length > 0) {
      // Ensure welcome message is always first
      const hasWelcome = history.some((m) => m.id === "welcome");
      if (hasWelcome) {
        setMessages(history);
      } else {
        setMessages([INITIAL_WELCOME_MESSAGE, ...history]);
      }
    }
    setIsLoaded(true);
  }, []);

  return {
    sessionId,
    messages,
    setMessages,
    isLoaded,
  };
}
