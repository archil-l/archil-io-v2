"use client";

import { Header } from "~/components/header";
import { PREDEFINED_PROMPTS } from "./constants";
import { useWelcomeSession } from "./hooks/use-welcome-session";
import { ConversationProvider } from "~/contexts/conversation-context";
import { WelcomeHeader } from "./components/welcome-header";
import { ConversationArea } from "./components/conversation-area";
import { InputArea } from "./components/input-area";
import { SuggestionBar } from "./components/suggestion-bar";
import { StickToBottom } from "use-stick-to-bottom";
import { ConversationScrollButton } from "~/components/ai-elements/conversation";

export default function Welcome() {
  const { messages: initialMessages, isLoaded } = useWelcomeSession();

  // Show loading state until client-side hydration is complete
  if (!isLoaded) {
    return <WelcomeHeader isLoaded={isLoaded} />;
  }

  return (
    <ConversationProvider initialMessages={initialMessages} isLoaded={isLoaded}>
      <div className="relative h-full w-full">
        <StickToBottom>
          {/* Header with icon buttons */}
          <Header />

          {/* Main Content */}
          <ConversationArea className="mt-20 w-full max-w-2xl mx-auto relative" />

          {/* Input and Suggestions */}
          <div className="fixed w-full bottom-0 pb-4 z-50 justify-items-center bg-(--background)">
            <InputArea />
            <SuggestionBar
              suggestions={PREDEFINED_PROMPTS}
              onSuggestionClick={(suggestion) => {
                // InputArea will handle this via context
                const event = new CustomEvent("suggestion-click", {
                  detail: suggestion,
                });
                window.dispatchEvent(event);
              }}
            />
          </div>
          <ConversationScrollButton className="fixed mb-36" />
        </StickToBottom>
      </div>
    </ConversationProvider>
  );
}
