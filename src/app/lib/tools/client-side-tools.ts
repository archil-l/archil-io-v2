import { tool } from "ai";
import z from "zod";

/**
 * toggleThemeTool - Toggle between light and dark theme
 *
 * This is a CLIENT-SIDE ONLY tool. NO execute function.
 * The actual theme toggle happens in ToggleThemeToolUI component on the client.
 */

export const themeSchema = z.enum(["light", "dark"]);
export const themeToggleOutput = z.object({
  toggled: z.boolean(),
  previousTheme: themeSchema,
  newTheme: themeSchema,
});

export type ThemeToggleOutputType = z.infer<typeof themeToggleOutput>;

export const toggleThemeTool = tool({
  description:
    "Toggle the website theme between light and dark mode. Call this when the user asks to change the theme, switch appearance, or toggle between modes.",
  inputSchema: z.object({}),
  outputSchema: themeToggleOutput,
});
