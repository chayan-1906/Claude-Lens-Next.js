import React from "react";
import {cn} from "@/utils/cn";
import {HiOutlineChevronDoubleRight} from "react-icons/hi";
import {MessageContent} from "./MessageContent";
import {IMessageBubbleProps} from "@/types/components";
import {formatModelName} from "@/utils/formatModelName";
import {parseUserMessage} from "@/utils/parseUserMessage";
import {formatRelativeDate} from "@/utils/formatRelativeDate";
import {extractMessageText} from "@/utils/extractMessageText";
import {CopyMessageButton} from "@/components/CopyMessageButton";
import {ContentBlock, EMessageRole, EUserMessageType} from "@/types/message";

const MessageBubble = React.memo(function MessageBubble({message, canEdit, onEdit, index, onRegenerate, sessionId, isSubAgentPrompt = false, onStubbed}: IMessageBubbleProps) {
    const isUserMessage: boolean = message.role === EMessageRole.USER;

    const isCommandOutput: boolean = isUserMessage && typeof message.content === 'string' && message.content.includes('<local-command-stdout>');
    const isToolResult: boolean = isUserMessage && Array.isArray(message.content) && message.content.some((block: ContentBlock) => block.type === 'tool_result');

    if (isUserMessage && typeof message.content === 'string') {
        const parsed = parseUserMessage(message.content);
        if (parsed.type === EUserMessageType.SYSTEM_CAVEAT) {
            return null;
        }
    }

    if (Array.isArray(message.content)) {
        const hasAnyBlock: boolean = message.content.length > 0;
        if (!hasAnyBlock) {
            return null;
        }
    }

    // Compute once — used for interrupt/synthetic detection and copy button
    const contentText: string = extractMessageText(message.content);

    // System-generated messages — render as non-interactive, centered, muted text
    const isInterruptMessage: boolean = isUserMessage && contentText === '[Request interrupted by user]';
    const isSyntheticMessage: boolean = !isUserMessage && message.aiModel === '<synthetic>';

    if (isInterruptMessage || isSyntheticMessage) {
        return (
            <div className={'flex flex-col items-center py-1'}>
                <span className={'text-xs text-text-muted italic'}>{contentText}</span>
            </div>
        );
    }

    const showCopyButton: boolean = typeof message.content === 'string' || message.content.some((block: ContentBlock) => block.type === 'text' || block.type === 'thinking');
    const hasNonTextBlock: boolean = Array.isArray(message.content) && message.content.some((block: ContentBlock) => block.type !== 'text');

    const isPlainUserMessage: boolean = isUserMessage && !isCommandOutput && !isToolResult && !isSubAgentPrompt;

    return (
        <div className={cn('flex flex-col group', isPlainUserMessage ? 'items-end' : 'items-start')}>
            <div className={cn(
                'max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-4 text-sm',
                (isSubAgentPrompt || hasNonTextBlock) ? 'py-3' : 'py-0',
                isSubAgentPrompt
                    ? 'border border-primary/25 bg-primary/4 text-text'
                    : isPlainUserMessage ? 'bg-user-bubble text-text' : 'bg-assistant-bubble text-text',
            )}>
                {isSubAgentPrompt && (
                    <div className={'flex items-center gap-1.5 pb-1'}>
                        <HiOutlineChevronDoubleRight className={'size-3.5 text-primary/60'}/>
                        <span className={'text-xs font-semibold text-primary/60'}>Sub-agent</span>
                    </div>
                )}
                <MessageContent content={message.content} sessionId={sessionId} messageId={message.messageId} onStubbed={onStubbed}/>
            </div>

            {/* Timestamp */}
            <div className={'flex items-center gap-2 mt-1 px-1'}>
                <span className={'text-[10px] text-text-muted'} suppressHydrationWarning title={new Date(message.timestamp).toLocaleString()}>{formatRelativeDate(message.timestamp)}</span>
                {/*{(!isUserMessage && onRegenerate) && (
                    <Button variant={'ghost'} size={'icon'} onClick={() => onRegenerate(index)} title={'Regenerate response'}
                            className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'}>
                        <HiOutlineRefresh className={'size-3.5'}/>
                    </Button>
                )}*/}
                {/*{(isUserMessage && canEdit && onEdit) && (
                    <Button variant={'ghost'} size={'icon'} onClick={() => onEdit(message.uuid)} title={'Edit message'} className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'}>
                        <HiOutlinePencil className={'size-3.5'}/>
                    </Button>
                )}*/}
                {showCopyButton && (
                    <CopyMessageButton text={contentText}/>
                )}
                {(!isUserMessage && message.aiModel) && (
                    <span className={'text-xs text-text-muted italic'}>
                        Prepared using {formatModelName(message.aiModel)}
                    </span>
                )}
            </div>
        </div>
    );
});

export {MessageBubble};
