import { tool } from "ai";
import { z } from "zod";
import { readKnowledge } from "./read-knowledge";

export const getExperienceTool = tool({
  description:
    "Get work experience history with roles, companies, and descriptions. Use this when the user asks about work history, past jobs, or career.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe("Optional search term to filter experience"),
  }),
  execute: async ({ query }) => {
    const content = readKnowledge("experience.md");
    if (query) {
      const lines = content.split("\n");
      const filtered = lines.filter((line) =>
        line.toLowerCase().includes(query.toLowerCase())
      );
      return filtered.length > 0 ? filtered.join("\n") : content;
    }
    return content;
  },
});
