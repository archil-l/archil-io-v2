export {
  setThemeToolDefinition,
  type SetThemeInput,
} from "./set-theme";

export {
  copyToClipboardToolDefinition,
  type CopyToClipboardInput,
} from "./copy-to-clipboard";

export const clientToolNames = ["setTheme", "copyToClipboard"] as const;
export type ClientToolName = (typeof clientToolNames)[number];
