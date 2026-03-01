import {cn} from "@/utils/cn";
import type {ContentBlock} from "@/types/message";
import {parseUserMessage} from "@/utils/parseUserMessage";
import {MessageContent} from "@/components/MessageContent";
import type {IMessageBubbleProps} from "@/types/components";
import {formatRelativeDate} from "@/utils/formatRelativeDate";
import {EMessageRole, EUserMessageType} from "@/types/message";

function MessageBubble({message}: IMessageBubbleProps) {
    const isUser: boolean = message.role === EMessageRole.USER;

    if (isUser && typeof message.content === 'string') {
        const parsed = parseUserMessage(message.content);
        if (parsed.type === EUserMessageType.SYSTEM_CAVEAT) {
            return null;
        }
    }

    if (Array.isArray(message.content)) {
        const hasVisibleBlock: boolean = message.content.some((block: ContentBlock) => block.type !== 'tool_result');
        if (!hasVisibleBlock) {
            return null;
        }
    }

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
                <p className={'text-[10px] text-text-muted mt-1 text-right'} title={new Date(message.timestamp).toLocaleString()}>{formatRelativeDate(message.timestamp)}</p>
            </div>
        </div>
    );
}

export {MessageBubble};
