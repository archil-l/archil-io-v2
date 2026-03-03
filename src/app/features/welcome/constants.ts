export const WELCOME_MESSAGE = `# Welcome! 🖖

I'm a software engineer at Amazon Robotics, building agentic AI systems, full-stack web applications and more. When I'm not coding, I'm trying to tinkering with something... 

Welcome to my personal page! I'm excited to share my work, projects, and insights into my engineering journey. Glad to have you here!

My AI assistant is here to chat - just ask :)
`;

import { Briefcase, Code, Mail, type LucideIcon } from "lucide-react";
import { AgentUIMessage } from "~/lib/message-schema";

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

export const INITIAL_WELCOME_MESSAGE: AgentUIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [{ type: "text", text: WELCOME_MESSAGE }],
};
