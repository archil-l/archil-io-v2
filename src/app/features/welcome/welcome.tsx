"use client";

import { useState, useEffect } from "react";

import { Conversation } from "~/components/ai-elements/conversation";
import { ConversationContent } from "~/components/ai-elements/conversation";
import { ConversationScrollButton } from "~/components/ai-elements/conversation";
import { Message } from "~/components/ai-elements/message";
import { MessageContent } from "~/components/ai-elements/message";
import { MessageResponse } from "~/components/ai-elements/message";
import { PromptInput } from "~/components/ai-elements/prompt-input";
import { PromptInputTextarea } from "~/components/ai-elements/prompt-input";
import { PromptInputSubmit } from "~/components/ai-elements/prompt-input";
import { Suggestions, Suggestion } from "~/components/ai-elements/suggestion";
import { FloatingMenu } from "~/components/floating-menu";
import {
  getOrCreateSessionId,
  getConversationHistory,
  saveConversationHistory,
  clearConversation,
  type MessageType,
} from "~/lib/session";

const welcomeMsg = `# Welcome! 🖖🏻

My name is Archil Lelashvili, I am a software engineer building dynamic, semantic, accessible, and user-friendly web applications.

Welcome to my personal page. I'm excited to share my work, projects, and insights into my journey in web development. Glad to have you here!
`;

const predefinedPrompts = [
  "Tell me about your experience",
  "What technologies do you work with?",
  "How can I contact you?",
];

const initialWelcomeMessage: MessageType = {
  id: "welcome",
  role: "assistant",
  content: welcomeMsg,
  parts: [{ type: "text", text: welcomeMsg }],
};

export default function Welcome() {
  const [messages, setMessages] = useState<MessageType[]>([
    initialWelcomeMessage,
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
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
        setMessages([initialWelcomeMessage, ...history]);
      }
    }
    setIsLoaded(true);
  }, []);

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
    setInput("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit({ text: suggestion });
  };

  const handleClearConversation = () => {
    clearConversation();
    setMessages([initialWelcomeMessage]);
  };

  // Show nothing until client-side hydration is complete
  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full">
      {/* Floating Menu Button */}
      <FloatingMenu onClearConversation={handleClearConversation} />

      {/* Main Content */}
      <div className="mx-auto flex h-full max-w-3xl flex-col p-4 pt-16">
        {/* Conversation Area */}
        <Conversation className="flex-1 h-full">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <Message
                        key={`${message.id}-${index}`}
                        from={message.role}
                      >
                        <MessageContent>
                          <MessageResponse>{part.text}</MessageResponse>
                        </MessageContent>
                      </Message>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className="mt-2 mb-4 space-y-3">
          <PromptInput
            onSubmit={handleSubmit}
            className="mt-4 w-full max-w-2xl mx-auto relative"
          >
            <PromptInputTextarea
              value={input}
              placeholder="Ask me anything..."
              onChange={(e) => setInput(e.currentTarget.value)}
              className="pr-12"
            />
            <PromptInputSubmit
              disabled={!input.trim()}
              className="absolute bottom-1 right-1"
            />
          </PromptInput>
          <Suggestions className="pb-2 mt-2 w-full max-w-2xl mx-auto relative flex-wrap justify-center">
            {predefinedPrompts.map((prompt) => (
              <Suggestion
                key={prompt}
                suggestion={prompt}
                onClick={handleSuggestionClick}
                className="font-normal"
              />
            ))}
          </Suggestions>
        </div>
      </div>
    </div>
  );
}
