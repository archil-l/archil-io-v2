import { Theme } from "~/hooks/use-theme";
import { ThemeCheckOutputType } from "../client-side-tools";

export type ToolOutputFn = (params: {
  tool: string;
  toolCallId: string;
  output: ThemeCheckOutputType;
}) => void;

/**
 * Creates a check theme handler for the AI chat tool system.
 * This handler reads the current theme and reports it without toggling.
 */
export function createCheckThemeHandler(theme: Theme) {
  return async (toolCallId: string, addToolOutput: ToolOutputFn) => {
    addToolOutput({
      tool: "checkTheme",
      toolCallId,
      output: { currentTheme: theme },
    });

    console.log(
      `[checkTheme] Tool execution completed - current theme: ${theme}`,
    );
  };
}
