import { tool } from "ai";
import { z } from "zod";
import { readKnowledge } from "./read-knowledge";

export const getTechnologiesTool = tool({
  description:
    "Get list of technologies and skills. Use this when the user asks about tech stack, skills, programming languages, or tools used.",
  inputSchema: z.object({
    category: z
      .enum(["frontend", "backend", "database", "devops", "other", "all"])
      .optional()
      .describe("Filter by technology category"),
  }),
  execute: async ({ category }) => {
    const content = readKnowledge("technologies.md");
    if (category && category !== "all") {
      const sectionRegex = new RegExp(
        `## ${category}\\n([\\s\\S]*?)(?=##|$)`,
        "i"
      );
      const match = content.match(sectionRegex);
      return match ? match[0] : content;
    }
    return content;
  },
});
