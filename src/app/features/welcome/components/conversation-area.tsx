"use client";
import { Conversation } from "~/components/ai-elements/conversation";
import { ConversationContent } from "~/components/ai-elements/conversation";
import { Message } from "~/components/ai-elements/message";
import { MessageContent } from "~/components/ai-elements/message";
import { MessageResponse } from "~/components/ai-elements/message";
import { cn } from "~/lib/utils";
import { useConversationContext } from "~/contexts/conversation-context";
import { useAutoScroll } from "../hooks/use-auto-scroll";
import { Button } from "~/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ConversationAreaProps {
  className: string;
}

export function ConversationArea({ className }: ConversationAreaProps) {
  const { messages, isLoading, handleRetryMessage } = useConversationContext();
  const { scrollAnchorRef } = useAutoScroll({ messages, isLoading });

  return (
    <Conversation className={cn("flex-1 h-auto", className)}>
      <ConversationContent>
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
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="animate-spin">
                              <RefreshCw size={14} />
                            </div>
                            Sending...
                          </div>
                        )}
                      {message.role === "user" &&
                        message.status === "error" && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                              <AlertCircle
                                size={14}
                                className="mt-0.5 flex-shrink-0"
                              />
                              <div className="flex-1">
                                <div className="font-medium">
                                  Failed to send
                                </div>
                                {message.error && (
                                  <div className="mt-1 text-xs">
                                    {message.error}
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => handleRetryMessage(message.id)}
                              disabled={isLoading}
                              size="sm"
                              variant="outline"
                              className="w-full"
                            >
                              <RefreshCw size={14} className="mr-2" />
                              Retry
                            </Button>
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
        <div ref={scrollAnchorRef} className="h-[100px]"></div>
      </ConversationContent>
    </Conversation>
  );
}
