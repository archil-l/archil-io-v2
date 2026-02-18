import { z } from "zod";

const setThemeSchema = z.object({
  theme: z
    .enum(["light", "dark", "toggle"])
    .describe(
      "The theme to set: 'light' for light mode, 'dark' for dark mode, or 'toggle' to switch between them",
    ),
});

export type SetThemeInput = z.infer<typeof setThemeSchema>;

export const setThemeToolDefinition = {
  name: "setTheme" as const,
  description:
    "Switch the website theme between light and dark mode. Call this when the user asks to change the theme, switch appearance, or toggle between light and dark mode. The tool will update the theme and display a beautiful animated transition.",
  parameters: setThemeSchema,
};
