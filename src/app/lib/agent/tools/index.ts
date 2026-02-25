import { ToolSet } from "ai";
import { toggleThemeTool, checkThemeTool } from "./client-side-tools";

export const allTools = {
  toggleTheme: toggleThemeTool,
  checkTheme: checkThemeTool,
} satisfies ToolSet;
