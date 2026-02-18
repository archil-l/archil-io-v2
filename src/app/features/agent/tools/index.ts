// Export individual tool definitions
export { setThemeToolDefinition, type SetThemeInput } from "./client/set-theme";
export {
  copyToClipboardToolDefinition,
  type CopyToClipboardInput,
} from "./client/copy-to-clipboard";

import { setThemeToolDefinition } from "./client/set-theme";
import { copyToClipboardToolDefinition } from "./client/copy-to-clipboard";

// Create clientTools object structured for AI SDK useChat
// This object maps tool names to their definitions with Zod schemas
export const clientTools = {
  setTheme: {
    description: setThemeToolDefinition.description,
    parameters: setThemeToolDefinition.parameters,
  },
  copyToClipboard: {
    description: copyToClipboardToolDefinition.description,
    parameters: copyToClipboardToolDefinition.parameters,
  },
} as const;

// Export list of client tool names for type safety
export const clientToolNames = ["setTheme", "copyToClipboard"] as const;
export type ClientToolName = (typeof clientToolNames)[number];
