"use client";

import { useEffect, useState } from "react";
import type { DynamicToolUIPart } from "ai";
import { ThemeSwitcher } from "~/components/ai-elements/theme-switcher";
import { useTheme } from "~/hooks/use-theme";

export interface ToggleThemeToolUIProps {
  tool: DynamicToolUIPart;
}

/**
 * ToggleThemeToolUI - Dynamic UI component for the toggleTheme tool
 *
 * When AI calls toggleTheme tool:
 * 1. Extract result from tool output
 * 2. Call toggleTheme() hook to actually switch theme
 * 3. Display animated feedback via ThemeSwitcher
 * 4. ThemeProvider applies DOM updates automatically
 */
export function ToggleThemeToolUI({ tool }: ToggleThemeToolUIProps) {
  const { theme, toggleTheme } = useTheme();
  const [toggled, setToggled] = useState(false);

  useEffect(() => {
    const output = tool.output as Record<string, unknown> | null;
    if (output?.toggled && !toggled) {
      // Actually toggle the theme when tool output arrives
      toggleTheme();
      setToggled(true);
    }
  }, [tool.output, toggled, toggleTheme]);

  if (!toggled) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <ThemeSwitcher targetTheme={theme} isAnimating={true} />
    </div>
  );
}
