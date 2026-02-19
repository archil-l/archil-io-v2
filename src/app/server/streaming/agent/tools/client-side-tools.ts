import { tool } from "ai";
import z from "zod";

export const setThemeTool = tool({
  description:
    "Get contact information including email, social links, and website. Use this when the user asks how to contact, reach out, or connect.",
  inputSchema: z.object({}),
});
