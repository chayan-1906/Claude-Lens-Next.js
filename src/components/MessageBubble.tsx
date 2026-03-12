import {cn} from "@/utils/cn";
import {HiOutlinePencil, HiOutlineRefresh} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import {MessageContent} from "./MessageContent";
import {IMessageBubbleProps} from "@/types/components";
import {formatModelName} from "@/utils/formatModelName";
import {parseUserMessage} from "@/utils/parseUserMessage";
import {formatRelativeDate} from "@/utils/formatRelativeDate";
import {extractMessageText} from "@/utils/extractMessageText";
import {CopyMessageButton} from "@/components/CopyMessageButton";
import {ContentBlock, EMessageRole, EUserMessageType} from "@/types/message";

function MessageBubble({message, onEdit, index, onRegenerate}: IMessageBubbleProps) {
    const isUserMessage: boolean = message.role === EMessageRole.USER;

    if (isUserMessage && typeof message.content === 'string') {
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

    // System-generated messages — render as non-interactive, centered, muted text
    const contentText: string = extractMessageText(message.content);
    const isInterruptMessage: boolean = isUserMessage && contentText === '[Request interrupted by user]';
    const isSyntheticMessage: boolean = !isUserMessage && message.aiModel === '<synthetic>';

    if (isInterruptMessage || isSyntheticMessage) {
        return (
            <div className={'flex flex-col items-center py-1'}>
                <span className={'text-xs text-text-muted italic'}>{contentText}</span>
            </div>
        );
    }

    const copyText: string = extractMessageText(message.content);
    const showCopyButton: boolean = typeof message.content === 'string' || message.content.some((block: ContentBlock) => block.type === 'text' || block.type === 'thinking');
    const hasToolUse: boolean = Array.isArray(message.content) && message.content.some((block: ContentBlock) => block.type === 'tool_use');

    return (
        <div className={cn('flex flex-col group', isUserMessage ? 'items-end' : 'items-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-4 text-sm', hasToolUse ? 'py-3' : 'py-0', isUserMessage ? 'bg-user-bubble text-text' : 'bg-assistant-bubble text-text')}>
                <MessageContent content={message.content}/>
            </div>
            <div className={'flex items-center gap-2 mt-1 px-1'}>
                <span className={'text-[10px] text-text-muted'} suppressHydrationWarning title={new Date(message.timestamp).toLocaleString()}>{formatRelativeDate(message.timestamp)}</span>
                {(!isUserMessage && onRegenerate) && (
                    <Button variant={'ghost'} size={'icon'} onClick={() => onRegenerate(index)} title={'Regenerate response'}
                            className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'}>
                        <HiOutlineRefresh className={'size-3.5'}/>
                    </Button>
                )}
                {(isUserMessage && onEdit) && (
                    <Button variant={'ghost'} size={'icon'} onClick={onEdit} title={'Edit message'} className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'}>
                        <HiOutlinePencil className={'size-3.5'}/>
                    </Button>
                )}
                {showCopyButton && (
                    <CopyMessageButton text={copyText}/>
                )}
                {(!isUserMessage && message.aiModel) && (
                    <span className={'text-xs text-text-muted italic'}>
                        Prepared using {formatModelName(message.aiModel)}
                    </span>
                )}
            </div>
        </div>
    );
}

export {MessageBubble};
