import { ToolSet } from "ai";
import {
  toggleThemeTool,
  checkThemeTool,
  webPreviewTool,
} from "./client-side-tools";

export const allTools = {
  toggleTheme: toggleThemeTool,
  checkTheme: checkThemeTool,
  webpreview: webPreviewTool,
} satisfies ToolSet;
