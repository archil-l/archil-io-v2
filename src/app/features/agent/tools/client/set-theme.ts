import { z } from "zod";

export const setThemeToolDefinition = {
  name: "setTheme" as const,
  description: "Switch the website theme between light and dark mode",
  parameters: z.object({
    theme: z
      .enum(["light", "dark", "toggle"])
      .describe("The theme to set, or 'toggle' to switch"),
  }),
};

export type SetThemeInput = z.infer<typeof setThemeToolDefinition.parameters>;
