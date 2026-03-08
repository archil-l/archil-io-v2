import { ToolSet } from "ai";
import {
  toggleThemeTool,
  checkThemeTool,
  showResumeTool,
} from "./client-side-tools";

export const allTools = {
  toggleTheme: toggleThemeTool,
  checkTheme: checkThemeTool,
  showResume: showResumeTool,
} satisfies ToolSet;
