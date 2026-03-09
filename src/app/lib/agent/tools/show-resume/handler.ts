"use client";

import { AddToolOutputFn } from "~/lib/agent/hooks/use-client-tool-handlers";

/**
 * Creates a show resume handler for the AI chat tool system.
 * This handler reports that the resume has been displayed (client-side rendering).
 */
export async function createShowResumeHandler(
  toolCallId: string,
  addToolOutput: AddToolOutputFn,
) {
  addToolOutput({
    state: "output-available",
    tool: "showResume",
    toolCallId,
    output: { displayed: true },
  });

  console.log(`[showResume] Tool execution completed`);
}
