"use client";
import { Conversation } from "~/components/ai-elements/conversation";
import { ConversationContent } from "~/components/ai-elements/conversation";
import { Message } from "~/components/ai-elements/message";
import { MessageContent } from "~/components/ai-elements/message";
import { MessageResponse } from "~/components/ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "~/components/ai-elements/reasoning";
import { cn } from "~/lib/utils";
import { useConversationContext } from "~/contexts/conversation-context";
import { useAutoScroll } from "../hooks/use-auto-scroll";
import { RefreshCw } from "lucide-react";

interface ConversationAreaProps {
  className: string;
}

export function ConversationArea({ className }: ConversationAreaProps) {
  const { messages, isLoading } = useConversationContext();
  const { scrollAnchorRef } = useAutoScroll({ messages, isLoading });

  // Check if we should show thinking indicator (assistant is streaming)
  const lastMessage = messages[messages.length - 1];
  const isAssistantThinking = lastMessage?.role === "assistant" && isLoading;

  return (
    <Conversation className={cn("flex-1 h-auto", className)}>
      <ConversationContent className="gap-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                return (
                  <div key={`${message.id}-${index}`}>
                    <Message from={message.role}>
                      <MessageContent className="transition-all">
                        <MessageResponse>{part.text}</MessageResponse>
                      </MessageContent>
                      {message.role === "user" &&
                        message.status === "pending" && (
                          <div className="flex items-center text-xs text-muted-foreground">
                            <div className="animate-spin">
                              <RefreshCw size={14} />
                            </div>
                            Sending...
                          </div>
                        )}
                    </Message>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}

        {/* Agent Thinking Display */}
        {isAssistantThinking && (
          <Message from="assistant">
            <MessageContent>
              <Reasoning isStreaming={true} defaultOpen={true}>
                <ReasoningTrigger />
                <ReasoningContent>
                  Analyzing your request and preparing a response...
                </ReasoningContent>
              </Reasoning>
            </MessageContent>
          </Message>
        )}

        <div ref={scrollAnchorRef} className="h-[100px]"></div>
      </ConversationContent>
    </Conversation>
  );
}
