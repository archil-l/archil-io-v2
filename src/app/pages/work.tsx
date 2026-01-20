import { Conversation } from "../components/ai-elements/conversation";
import { ConversationContent } from "../components/ai-elements/conversation";
import { ConversationScrollButton } from "../components/ai-elements/conversation";
import { Message } from "../components/ai-elements/message";
import { MessageContent } from "../components/ai-elements/message";
import { MessageResponse } from "../components/ai-elements/message";
import { PromptInput } from "../components/ai-elements/prompt-input";
import { PromptInputBody } from "../components/ai-elements/prompt-input";
import { PromptInputTextarea } from "../components/ai-elements/prompt-input";
import { PromptInputSubmit } from "../components/ai-elements/prompt-input";
import { useState } from "react";

const workMessage = `
## Work 👨🏻‍💻

I'm **Frontend Engineer II** on the 📦 Sortation Insights team at [Amazon Robotics](https://www.aboutamazon.com/news/operations/amazon-robotics-robots-fulfillment-center). In this role, I build scalable, reliable, and high-performance web applications that manage and monitor robotic systems used in outbound dock automation. My team builds advanced tools aimed at optimizing Overall Equipment Effectiveness (OEE) across robotic sortation processes.

I previously worked at the enterprise SaaS platform [Quickbase](https://www.quickbase.com), where I joined as a Software Engineering Co-op and advanced to the role of Software Engineer II. I spent most of my time on a UI infrastructure team, building new features, reusable components, and contributing to Quickbase's design system library.

### Key Contributions at Quickbase:

**Navigation System (2024)** - Rebuilt from ground up with modern UX, implemented accessibility features and WCAG 2.1 compliance.

**Summary Reports (2024)** - Led a team of 4 co-ops for 6 months, built enhanced summary reports with streamlined navigation and unified panel experience.

**Forms Experience (2023)** - Built and refined 10+ field components for drag-and-drop WYSIWYG form builder.

**Calendar Dashboard Widget (2022)** - Built calendar report component with drag-and-drop functionality and timezone support.

## Projects 🪚

### Personal page AI assistant 🤖 (in progress)

This personal assistant will be able to interact with site visitors on my behalf and accomplish basic tasks using connected tools (e.g., sending emails and notifications). It is based on a secure, cloud-based AI agent with a custom backend designed to keep sensitive API keys protected.

- Backend infrastructure provisioned with **AWS CDK, including Lambda functions, API Gateway, CloudFront, and Secrets Manager**
- API access restricted using CloudFront signed cookies
- Private keys securely stored in AWS Secrets Manager
- See the backend implementation on [GitHub](https://github.com/archil-l/secure-ai-agent)

---

This page is built 👨🏻‍💻 using React, TypeScript and styled-components. The page contents are stored in markdown files and rendered using markdown-to-jsx. Skeleton.css is used for initial, basic styling. I added responsiveness and light/dark mode 🌓 support.

Feel free to ask me anything about my work, projects, or web development in general!`;

type MessageType = {
  id: string;
  role: "user" | "assistant";
  content: string;
  parts: { type: "text"; text: string }[];
};

export default function Homepage() {
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "welcome",
      role: "assistant",
      content: workMessage,
      parts: [{ type: "text", text: workMessage }],
    },
  ]);

  const [input, setInput] = useState("");

  const handleSubmit = (message: any) => {
    if (!message.text?.trim()) return;

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: message.text,
      parts: [{ type: "text" as const, text: message.text }],
    };

    // Add mock AI response
    const aiResponse = {
      id: `ai-${Date.now()}`,
      role: "assistant" as const,
      content:
        "Thanks for your message! This is a mock response. The AI integration will be added later.",
      parts: [
        {
          type: "text" as const,
          text: "Thanks for your message! This is a mock response. The AI integration will be added later.",
        },
      ],
    };

    setMessages((prev) => [...prev, userMessage, aiResponse]);
    setInput("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 relative size-full h-screen">
      <div className="flex flex-col h-full">
        <Conversation className="h-full">
          <ConversationContent>
            {messages.map((message) => (
              <div key={message.id}>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <Message
                        key={`${message.id}-${index}`}
                        from={message.role}
                      >
                        <MessageContent>
                          <MessageResponse>{part.text}</MessageResponse>
                        </MessageContent>
                      </Message>
                    );
                  }
                  return null;
                })}
              </div>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <PromptInput onSubmit={handleSubmit} className="mt-4">
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about my work or projects..."
            />
          </PromptInputBody>
          <PromptInputSubmit disabled={!input.trim()} />
        </PromptInput>
      </div>
    </div>
  );
}
