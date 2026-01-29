import { useState, useEffect } from "react";
import { PromptInput } from "~/components/ai-elements/prompt-input";
import { PromptInputTextarea } from "~/components/ai-elements/prompt-input";
import { PromptInputSubmit } from "~/components/ai-elements/prompt-input";
import { useConversationContext } from "~/contexts/conversation-context";

export function InputArea() {
  const { handleSubmit: onSubmit, isLoading } = useConversationContext();
  const [input, setInput] = useState("");

  // Listen for suggestion clicks
  useEffect(() => {
    const handleSuggestionClick = (event: CustomEvent<string>) => {
      const suggestion = event.detail;
      onSubmit({ text: suggestion });
    };

    window.addEventListener(
      "suggestion-click",
      handleSuggestionClick as EventListener,
    );
    return () => {
      window.removeEventListener(
        "suggestion-click",
        handleSuggestionClick as EventListener,
      );
    };
  }, [onSubmit]);

  const handleSubmit = (message: { text?: string }) => {
    onSubmit(message);
    setInput("");
  };

  return (
    <PromptInput
      onSubmit={handleSubmit}
      className="w-full max-w-2xl mx-auto relative"
    >
      <PromptInputTextarea
        value={input}
        placeholder="Ask me anything..."
        onChange={(e) => setInput(e.currentTarget.value)}
        className="pr-12"
      />
      <PromptInputSubmit
        disabled={!input.trim() || isLoading}
        className="absolute bottom-1 right-1"
      />
    </PromptInput>
  );
}
