// Session Management Utilities for AI Assistant
// Handles visitor session tracking and conversation persistence via localStorage

const SESSION_ID_KEY = "archil-io-session-id";
const CONVERSATION_KEY = "archil-io-conversation";

export type MessageType = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts: { type: "text"; text: string }[];
};

/**
 * Get or create a unique session ID for the visitor
 * Uses crypto.randomUUID() for generating UUIDs
 */
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let sessionId = localStorage.getItem(SESSION_ID_KEY);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }

  return sessionId;
}

/**
 * Get the current session ID (returns null if not set)
 */
export function getSessionId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(SESSION_ID_KEY);
}

/**
 * Retrieve conversation history from localStorage
 */
export function getConversationHistory(): MessageType[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = localStorage.getItem(CONVERSATION_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save conversation history to localStorage
 */
export function saveConversationHistory(messages: MessageType[]): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CONVERSATION_KEY, JSON.stringify(messages));
}

/**
 * Clear conversation history (keeps session ID)
 */
export function clearConversation(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(CONVERSATION_KEY);
}

/**
 * Clear everything (session ID and conversation)
 */
export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(CONVERSATION_KEY);
}
