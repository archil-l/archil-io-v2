"use client";
import type { UIMessagePart, UIDataTypes, UITools } from "ai";
import { Conversation } from "~/components/ai-elements/conversation";
import { ConversationContent } from "~/components/ai-elements/conversation";
import { Message } from "~/components/ai-elements/message";
import { MessageContent } from "~/components/ai-elements/message";
import { useAutoScroll } from "../hooks/use-auto-scroll";
import { UIMessagePartRenderer } from "./ui-message-part-renderer";
import { MessageType } from "~/lib/session";
import { cn } from "~/lib/utils";
import { useConversationContext } from "~/contexts/conversation-context";

interface ConversationAreaProps {
  className: string;
}

export function ConversationArea({ className }: ConversationAreaProps) {
  const { messages, isLoading } = useConversationContext();
  const { scrollAnchorRef } = useAutoScroll({ messages, isLoading });

  return (
    <Conversation className={cn("flex-1 h-auto", className)}>
      <ConversationContent className="gap-4">
        {messages.map((message: MessageType) => (
          <div key={message.id}>
            <Message from={message.role}>
              <MessageContent className="transition-all">
                {message.parts.map(
                  (
                    part: UIMessagePart<UIDataTypes, UITools>,
                    index: number,
                  ) => (
                    <UIMessagePartRenderer
                      key={`${message.id}-part-${index}`}
                      part={part}
                      index={index}
                      messageId={message.id}
                      isStreaming={
                        isLoading && message === messages[messages.length - 1]
                      }
                    />
                  ),
                )}
              </MessageContent>
            </Message>
          </div>
        ))}

        <div ref={scrollAnchorRef} className="h-[100px]"></div>
      </ConversationContent>
    </Conversation>
  );
}
