"use client";

import { FloatingMenu } from "~/components/floating-menu";
import { PREDEFINED_PROMPTS } from "./constants";
import { useWelcomeSession } from "./hooks/use-welcome-session";
import { useConversation } from "./hooks/use-conversation";
import { WelcomeHeader } from "./components/welcome-header";
import { ConversationArea } from "./components/conversation-area";
import { InputArea } from "./components/input-area";
import { SuggestionBar } from "./components/suggestion-bar";

export default function Welcome() {
  const { messages, setMessages, isLoaded } = useWelcomeSession();
  const { handleSubmit, handleClearConversation } = useConversation({
    messages,
    setMessages,
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
    <div className="relative h-screen w-full">
      {/* Floating Menu Button */}
      <FloatingMenu onClearConversation={handleClearConversation} />

      {/* Main Content */}
      <div className="mx-auto flex h-full max-w-3xl flex-col p-4 pt-16">
        {/* Conversation Area */}
        <ConversationArea messages={messages} />

        {/* Input and Suggestions */}
        <div className="mt-2 mb-4 space-y-3">
          <InputArea onSubmit={handleSubmit} />
          <SuggestionBar
            suggestions={PREDEFINED_PROMPTS}
            onSuggestionClick={handleSuggestionClick}
          />
        </div>
      </div>
    </div>
  );
}
