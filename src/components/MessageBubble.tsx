import {cn} from "@/utils/cn";
import {HiOutlinePencil} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import {MessageContent} from "./MessageContent";
import type {ContentBlock} from "@/types/message";
import {formatModelName} from "@/utils/formatModelName";
import {parseUserMessage} from "@/utils/parseUserMessage";
import type {IMessageBubbleProps} from "@/types/components";
import {formatRelativeDate} from "@/utils/formatRelativeDate";
import {extractMessageText} from "@/utils/extractMessageText";
import {EMessageRole, EUserMessageType} from "@/types/message";
import {CopyMessageButton} from "@/components/CopyMessageButton";

function MessageBubble({message, onEdit}: IMessageBubbleProps) {
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
        <div className={cn('flex flex-col group', isUser ? 'items-end' : 'items-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-4 text-sm', isUser ? 'bg-user-bubble text-text' : 'bg-assistant-bubble text-text')}>
                <MessageContent content={message.content}/>
            </div>
            <div className={'flex items-center gap-2 mt-1 px-1'}>
                <span className={'text-[10px] text-text-muted'} suppressHydrationWarning title={new Date(message.timestamp).toLocaleString()}>{formatRelativeDate(message.timestamp)}</span>
                {(isUser && onEdit) && (
                    <Button variant={'ghost'} size={'icon'} onClick={onEdit} className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'} title={'Edit message'}>
                        <HiOutlinePencil className={'size-3.5'}/>
                    </Button>
                )}
                {showCopyButton && (
                    <CopyMessageButton text={copyText}/>
                )}
                {(!isUser && message.aiModel) && (
                    <span className={'text-xs text-text-muted italic'}>
                        Prepared using {formatModelName(message.aiModel)}
                    </span>
                )}
            </div>
        </div>
    );
}

export {MessageBubble};
