import { Conversation } from "~/components/ai-elements/conversation";
import { ConversationContent } from "~/components/ai-elements/conversation";
import { Message } from "~/components/ai-elements/message";
import { MessageContent } from "~/components/ai-elements/message";
import { MessageResponse } from "~/components/ai-elements/message";
import { type MessageType } from "~/lib/session";
import { cn } from "~/lib/utils";

interface ConversationAreaProps {
  className: string;
  messages: MessageType[];
  isLoading?: boolean;
}

export function ConversationArea({
  className,
  messages,
  isLoading,
}: ConversationAreaProps) {
  return (
    <Conversation className={cn("flex-1 h-auto", className)}>
      <ConversationContent>
        {messages.map((message) => (
          <div key={message.id}>
            {message.parts.map((part, index) => {
              if (part.type === "text") {
                return (
                  <Message key={`${message.id}-${index}`} from={message.role}>
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
        <div className="h-[120px]"></div>
      </ConversationContent>
    </Conversation>
  );
}
