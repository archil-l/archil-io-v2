import { type MessageType } from "~/lib/session";

export const WELCOME_MESSAGE = `# Welcome! 🖖🏻 \n\n

My name is Archil Lelashvili, I am a software engineer building dynamic, semantic, accessible, and user-friendly web applications.

Welcome to my personal page. I'm excited to share my work, projects, and insights into my journey in web development. Glad to have you here!
`;

import { Briefcase, Code, Mail, type LucideIcon } from "lucide-react";

export interface SuggestionPrompt {
  text: string;
  icon: LucideIcon;
  iconColor: string;
}

export const PREDEFINED_PROMPTS: SuggestionPrompt[] = [
  {
    text: "Tell me about your experience",
    icon: Briefcase,
    iconColor: "text-blue-500",
  },
  {
    text: "What technologies do you work with?",
    icon: Code,
    iconColor: "text-green-500",
  },
  {
    text: "How can I contact you?",
    icon: Mail,
    iconColor: "text-purple-500",
  },
];

export const INITIAL_WELCOME_MESSAGE: MessageType = {
  id: "welcome",
  role: "assistant",
  content: WELCOME_MESSAGE,
  parts: [{ type: "text", text: WELCOME_MESSAGE }],
};
