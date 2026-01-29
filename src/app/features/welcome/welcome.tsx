"use client";

import { Header } from "~/components/header";
import { PREDEFINED_PROMPTS } from "./constants";
import { useWelcomeSession } from "./hooks/use-welcome-session";
import { ConversationProvider } from "~/contexts/conversation-context";
import { WelcomeHeader } from "./components/welcome-header";
import { ConversationArea } from "./components/conversation-area";
import { InputArea } from "./components/input-area";
import { SuggestionBar } from "./components/suggestion-bar";
import { ScrollToBottomButton } from "./components/scroll-to-bottom-button";
import { useAutoScroll } from "./hooks/use-auto-scroll";
import { useConversationContext } from "~/contexts/conversation-context";

export default function Welcome() {
  const { messages: initialMessages, isLoaded } = useWelcomeSession();

  // Show loading state until client-side hydration is complete
  if (!isLoaded) {
    return <WelcomeHeader isLoaded={isLoaded} />;
  }

  return (
    <ConversationProvider initialMessages={initialMessages} isLoaded={isLoaded}>
      <WelcomeContent />
    </ConversationProvider>
  );
}

function WelcomeContent() {
  const { messages, isLoading } = useConversationContext();
  const { showScrollButton, scrollToBottom } = useAutoScroll({
    messages,
    isLoading,
  });

  return (
    <div className="relative h-full w-full">
      {/* Header with icon buttons */}
      <Header />

      {/* Main Content */}
      <ConversationArea className="mt-[100px] w-full max-w-3xl mx-auto relative" />

      {/* Scroll to Bottom Button */}
      <ScrollToBottomButton
        onClick={scrollToBottom}
        show={showScrollButton}
        className="bottom-[170px]"
      />

      {/* Input and Suggestions */}
      <div className="fixed w-full bottom-0 p-4 z-50 justify-items-center bg-(--background)">
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
    </div>
  );
}
