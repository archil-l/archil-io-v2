"use client";

import { FloatingMenu } from "~/components/floating-menu";
import { PREDEFINED_PROMPTS } from "./constants";
import { useWelcomeSession } from "./hooks/use-welcome-session";
import { useConversation } from "./hooks/use-conversation";
import { WelcomeHeader } from "./components/welcome-header";
import { ConversationArea } from "./components/conversation-area";
import { InputArea } from "./components/input-area";
import { SuggestionBar } from "./components/suggestion-bar";
import { StickToBottom } from "use-stick-to-bottom";
import { ConversationScrollButton } from "~/components/ai-elements/conversation";
import { Fragment } from "react/jsx-runtime";

export default function Welcome() {
  const { messages: initialMessages, isLoaded } = useWelcomeSession();
  const { messages, isLoading, handleSubmit, handleClearConversation } =
    useConversation({
      initialMessages,
      isLoaded,
    });

  const handleSuggestionClick = (suggestion: string) => {
    handleSubmit({ text: suggestion });
  };

  // Show loading state until client-side hydration is complete
  if (!isLoaded) {
    return <WelcomeHeader isLoaded={isLoaded} />;
  }

  return (
    <div className="relative h-full w-full">
      <StickToBottom>
        {/* Floating Menu Button */}
        <FloatingMenu onClearConversation={handleClearConversation} />

        {/* Main Content */}
        <ConversationArea
          className="mt-4 w-full max-w-2xl mx-auto relative"
          messages={messages}
          isLoading={isLoading}
        />

        {/* Input and Suggestions */}
        <div className="fixed w-full bottom-0 pb-4 z-50 justify-items-center bg-(--background)">
          <InputArea onSubmit={handleSubmit} isLoading={isLoading} />
          <SuggestionBar
            suggestions={PREDEFINED_PROMPTS}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>
        <ConversationScrollButton className="fixed mb-36" />
      </StickToBottom>
    </div>
  );
}
