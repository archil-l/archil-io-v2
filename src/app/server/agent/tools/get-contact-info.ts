import { tool } from "ai";
import { z } from "zod";
import { readKnowledge } from "./read-knowledge";

export const getContactInfoTool = tool({
  description:
    "Get contact information including email, social links, and website. Use this when the user asks how to contact, reach out, or connect.",
  inputSchema: z.object({}),
  execute: async () => {
    const content = readKnowledge("contact.md");
    return content;
  },
});
