import { ToolSet } from "ai";
import {
  toggleThemeTool,
  checkThemeTool,
  webPreviewTool,
  showResumeTool,
} from "./client-side-tools";

export const allTools = {
  toggleTheme: toggleThemeTool,
  checkTheme: checkThemeTool,
  webpreview: webPreviewTool,
  showResume: showResumeTool,
} satisfies ToolSet;
