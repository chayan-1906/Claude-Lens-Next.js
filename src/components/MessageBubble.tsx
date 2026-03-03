import {cn} from "@/utils/cn";
import {MessageContent} from "./MessageContent";
import type {ContentBlock} from "@/types/message";
import {parseUserMessage} from "@/utils/parseUserMessage";
import type {IMessageBubbleProps} from "@/types/components";
import {formatRelativeDate} from "@/utils/formatRelativeDate";
import {extractMessageText} from "@/utils/extractMessageText";
import {EMessageRole, EUserMessageType} from "@/types/message";
import {CopyMessageButton} from "@/components/CopyMessageButton";

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

    const copyText: string = extractMessageText(message.content);
    const showCopyButton: boolean = typeof message.content === 'string' || message.content.some((block: ContentBlock) => block.type === 'text' || block.type === 'thinking');

    return (
        <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-4 text-sm', Array.isArray(message.content) && 'py-3', isUser ? 'bg-user-bubble text-text' : 'bg-assistant-bubble text-text')}>
                <MessageContent content={message.content}/>
            </div>
            <div className={'flex items-center gap-2 mt-1 px-1'}>
                <span className={'text-[10px] text-text-muted'} title={new Date(message.timestamp).toLocaleString()}>{formatRelativeDate(message.timestamp)}</span>
                {showCopyButton && (
                    <CopyMessageButton text={copyText}/>
                )}
            </div>
        </div>
    );
}

export {MessageBubble};
