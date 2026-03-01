import {cn} from "@/utils/cn";
import {EMessageRole} from "@/types/message";
import {MessageContent} from "@/components/MessageContent";
import type {IMessageBubbleProps} from "@/types/components";

function MessageBubble({message}: IMessageBubbleProps) {
    const isUser: boolean = message.role === EMessageRole.USER;

    return (
        <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm',
                    isUser
                        ? 'bg-user-bubble text-text'
                        : 'bg-assistant-bubble text-text',
                )}
            >
                <MessageContent content={message.content}/>
            </div>
        </div>
    );
}

export {MessageBubble};
