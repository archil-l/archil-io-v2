import { z } from "zod";

const copyToClipboardSchema = z.object({
  text: z.string().describe("The text to copy to clipboard"),
  label: z
    .string()
    .optional()
    .describe("A friendly label for what was copied (e.g., 'email address')"),
});

export type CopyToClipboardInput = z.infer<typeof copyToClipboardSchema>;

export const copyToClipboardToolDefinition = {
  name: "copyToClipboard" as const,
  description:
    "Copy text to the user's clipboard (e.g., email address, code snippets)",
  parameters: copyToClipboardSchema,
};
