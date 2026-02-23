import { Theme } from "~/hooks/use-theme";
import { ThemeToggleOutputType } from "../client-side-tools";

export type ToolOutputFn = (params: {
  tool: string;
  toolCallId: string;
  output: ThemeToggleOutputType;
}) => void;

/**
 * Creates a toggle theme handler for the AI chat tool system.
 * This handler executes the theme toggle and reports the result.
 */
export function createToggleThemeHandler(
  theme: Theme,
  toggleTheme: () => void,
) {
  return async (toolCallId: string, addToolOutput: ToolOutputFn) => {
    const previousTheme = theme;
    const newTheme = previousTheme === "light" ? "dark" : "light";
    toggleTheme();

    addToolOutput({
      tool: "toggleTheme",
      toolCallId,
      output: { toggled: true, previousTheme, newTheme },
    });

    console.log(`[toggleTheme] Tool execution completed`);
  };
}
