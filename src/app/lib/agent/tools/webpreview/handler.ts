import { WebPreviewOutputType } from "../client-side-tools";

export type ToolOutputFn = (params: {
  tool: string;
  toolCallId: string;
  output: WebPreviewOutputType;
}) => void;

/**
 * Creates a webpreview handler for the AI chat tool system.
 * This handler processes the webpreview tool call and reports the result.
 */
export function createWebPreviewHandler() {
  return async (toolCallId: string, addToolOutput: ToolOutputFn) => {
    // For now, we'll assume the webpreview always succeeds
    // In the future, we could add validation or error handling here

    addToolOutput({
      tool: "webpreview",
      toolCallId,
      output: { opened: true },
    });

    console.log(`[webpreview] Tool execution completed`);
  };
}
