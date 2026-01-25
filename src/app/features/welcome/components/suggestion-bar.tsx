import { Suggestions, Suggestion } from "~/components/ai-elements/suggestion";

interface SuggestionBarProps {
  suggestions: string[];
  onSuggestionClick: (suggestion: string) => void;
}

export function SuggestionBar({
  suggestions,
  onSuggestionClick,
}: SuggestionBarProps) {
  return (
    <Suggestions className="pb-2 mt-2 w-full max-w-2xl mx-auto relative flex-wrap justify-center">
      {suggestions.map((prompt) => (
        <Suggestion
          key={prompt}
          suggestion={prompt}
          onClick={onSuggestionClick}
          className="font-normal"
        />
      ))}
    </Suggestions>
  );
}
