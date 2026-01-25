import { Conversation } from "~/components/ai-elements/conversation";
import { ConversationContent } from "~/components/ai-elements/conversation";
import { ConversationScrollButton } from "~/components/ai-elements/conversation";
import { Message } from "~/components/ai-elements/message";
import { MessageContent } from "~/components/ai-elements/message";
import { MessageResponse } from "~/components/ai-elements/message";
import { type MessageType } from "~/lib/session";

interface ConversationAreaProps {
  messages: MessageType[];
  isLoading?: boolean;
}

export function ConversationArea({ messages, isLoading }: ConversationAreaProps) {
  return (
    <Conversation className="flex-1 h-full">
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
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
