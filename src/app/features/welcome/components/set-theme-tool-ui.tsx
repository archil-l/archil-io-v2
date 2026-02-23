"use client";

import type { DynamicToolUIPart } from "ai";
import { ThemeSwitcher } from "~/components/ai-elements/theme-switcher";
import { useTheme } from "~/hooks/use-theme";

export interface ToggleThemeToolUIProps {
  tool: DynamicToolUIPart;
}

/**
 * ToggleThemeToolUI - Dynamic UI component for the toggleTheme tool
 *
 * Renders the ThemeSwitcher immediately when the tool is called.
 * The actual theme toggle is handled by useAgentChat's onToolCall handler.
 * This component just displays the animated feedback.
 */
export function ToggleThemeToolUI({ tool }: ToggleThemeToolUIProps) {
  const { theme } = useTheme();

  // Get the state to determine if we're still running or completed
  const state = tool.state || "input-available";
  const isCompleted = state === "output-available" || state === "output-error";

  // Always render the theme switcher - it shows the current theme state
  // The animation indicates the toggle is happening
  return (
    <div className="flex justify-center py-4">
      <ThemeSwitcher targetTheme={theme} isAnimating={!isCompleted} />
    </div>
  );
}
