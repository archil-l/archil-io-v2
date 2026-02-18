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
import { ToolResultRenderer } from "~/components/ai-elements/tool-result-renderer";
import { cn } from "~/lib/utils";
import { useConversationContext } from "~/contexts/conversation-context";
import { useAutoScroll } from "../hooks/use-auto-scroll";
import type { ToolUIPart } from "ai";

interface ConversationAreaProps {
  className: string;
}

export function ConversationArea({ className }: ConversationAreaProps) {
  const { messages, isLoading, toolCalls } = useConversationContext();
  const { scrollAnchorRef } = useAutoScroll({ messages, isLoading });

  // Check if we should show thinking indicator (assistant is streaming)
  const lastMessage = messages[messages.length - 1];
  const isAssistantThinking = lastMessage?.role === "assistant" && isLoading;

  // Extract tool names from tool calls for rendering
  const toolNameMap = new Map<string, string>();
  if (toolCalls) {
    const toolCallsByName = new Map<string, ToolUIPart[]>();
    for (const call of toolCalls) {
      const name =
        (call as unknown as { toolName?: string }).toolName || "unknown";
      if (!toolCallsByName.has(name)) {
        toolCallsByName.set(name, []);
      }
      toolCallsByName.get(name)?.push(call);
      // Store latest call for each tool
      const calls = toolCallsByName.get(name) || [];
      if (calls.length > 0) {
        const callId =
          (call as unknown as { toolCallId?: string }).toolCallId || "";
        toolNameMap.set(callId, name);
      }
    }
  }

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
                    </Message>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}

        {/* Display Tool Results */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="space-y-3">
            {toolCalls.map((toolCall) => {
              const toolName =
                (toolCall as unknown as { toolName?: string }).toolName ||
                "unknown";
              const toolCallId =
                (toolCall as unknown as { toolCallId?: string }).toolCallId ||
                Math.random();
              return (
                <ToolResultRenderer
                  key={toolCallId}
                  toolCall={toolCall}
                  toolName={toolName}
                />
              );
            })}
          </div>
        )}

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
