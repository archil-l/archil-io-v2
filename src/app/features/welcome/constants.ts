import { type MessageType } from "~/lib/session";

export const WELCOME_MESSAGE = `# Welcome! 🖖🏻 \n\n

My name is Archil Lelashvili, I am a software engineer building dynamic, semantic, accessible, and user-friendly web applications.

Welcome to my personal page. I'm excited to share my work, projects, and insights into my journey in web development. Glad to have you here!
`;

export const PREDEFINED_PROMPTS = [
  "Tell me about your experience",
  "What technologies do you work with?",
  "How can I contact you?",
];

export const INITIAL_WELCOME_MESSAGE: MessageType = {
  id: "welcome",
  role: "assistant",
  content: WELCOME_MESSAGE,
  parts: [{ type: "text", text: WELCOME_MESSAGE }],
};
