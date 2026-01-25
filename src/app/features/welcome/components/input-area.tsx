import { useState } from "react";
import { PromptInput } from "~/components/ai-elements/prompt-input";
import { PromptInputTextarea } from "~/components/ai-elements/prompt-input";
import { PromptInputSubmit } from "~/components/ai-elements/prompt-input";

interface InputAreaProps {
  onSubmit: (message: { text?: string }) => void;
}

export function InputArea({ onSubmit }: InputAreaProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (message: { text?: string }) => {
    onSubmit(message);
    setInput("");
  };

  return (
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
  );
}
