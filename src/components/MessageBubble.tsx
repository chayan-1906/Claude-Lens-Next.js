import React from "react";
import {HiOutlineChevronDoubleRight, HiOutlineDocument} from "react-icons/hi";
import {MessageContent} from "./MessageContent";
import {BubbleShell} from "@/components/BubbleShell";
import {IMessageBubbleProps} from "@/types/components";
import {formatModelName} from "@/utils/formatModelName";
import {parseUserMessage} from "@/utils/parseUserMessage";
import {ImageThumbnail} from "@/components/ImageThumbnail";
import {ReadAloudButton} from "@/components/ReadAloudButton";
import {formatRelativeDate} from "@/utils/formatRelativeDate";
import {CopyMessageButton} from "@/components/CopyMessageButton";
import {extractMessageText, extractSpeakableText} from "@/utils/extractMessageText";
import {ContentBlock, EMessageRole, EUserMessageType, IAttachmentMeta} from "@/types/message";

// Matches the exact pattern the backend writes for non-image, non-PDF attachments:
// "File attached: filename — https://..."
const FILE_ATTACHED_PATTERN: RegExp = /^File attached: .+ — https?:\/\/.+$/;
const HEIC_MIME_TYPES: Set<string> = new Set(['image/heic', 'image/heif']);

const MessageBubble = React.memo(function MessageBubble({
                                                            message, canEdit, onEdit, index, onRegenerate, sessionId, isSubAgentPrompt = false, onStubbed, tts, toolUseMap, toolResultMap,
                                                            pendingApprovalToolUseId,
                                                        }: IMessageBubbleProps) {
    const isUserMessage: boolean = message.role === EMessageRole.USER;

    const isCommandOutput: boolean = isUserMessage && typeof message.content === 'string' && message.content.includes('<local-command-stdout>');
    const isToolResult: boolean = isUserMessage && Array.isArray(message.content) && message.content.some((block: ContentBlock) => block.type === 'tool_result');
    // Compact summary — Claude CLI injects this as a user message after /compact.
    // Render left-aligned (assistant side) since it is a system-generated notice, not a human turn.
    const isCompactSummary: boolean = isUserMessage
        && typeof message.content === 'string'
        && message.content.startsWith('This session is being continued from a previous conversation that ran out of context');

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

    const showCopyButton: boolean = typeof message.content === 'string' || message.content.some((block: ContentBlock) => block.type === 'text');
    const speakableText: string = extractSpeakableText(message.content);

    // Historical user messages: render attachment cards from message.attachments (IAttachmentMeta[])
    // and filter out the redundant "File attached: name — url" text blocks from content.
    const hasHistoricalAttachments: boolean = isUserMessage && !!(message.attachments?.length);

    const displayContent: string | ContentBlock[] = (hasHistoricalAttachments && Array.isArray(message.content))
        ? (message.content as ContentBlock[]).filter((block: ContentBlock) => {
            if (block.type !== 'text') return true;
            return !FILE_ATTACHED_PATTERN.test((block as { type: 'text'; text: string }).text.trim());
        })
        : message.content;

    const hasNonTextBlock: boolean = hasHistoricalAttachments || (Array.isArray(message.content) && message.content.some((block: ContentBlock) => block.type !== 'text'));

    return (
        <BubbleShell
            isUser={isUserMessage}
            isSystemUser={isCommandOutput || isToolResult || isCompactSummary}
            isSubAgentPrompt={isSubAgentPrompt}
            hasNonTextBlock={hasNonTextBlock}
            metadata={
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
                        <CopyMessageButton text={speakableText}/>
                    )}
                    {(!isUserMessage && tts && speakableText) && (
                        <ReadAloudButton text={speakableText} messageId={message.messageId} tts={tts}/>
                    )}
                    {(!isUserMessage && message.aiModel) && (
                        <span className={'text-xs text-text-muted italic'}>
                            Prepared using {formatModelName(message.aiModel)}
                        </span>
                    )}
                </div>
            }
        >
            {isSubAgentPrompt && (
                <div className={'flex items-center gap-1.5 pb-1'}>
                    <HiOutlineChevronDoubleRight className={'size-3.5 text-primary/60'}/>
                    <span className={'text-xs font-semibold text-primary/60'}>Sub-agent</span>
                </div>
            )}
            {hasHistoricalAttachments && (
                <div className={'flex flex-wrap gap-2 mb-2'}>
                    {(message.attachments as IAttachmentMeta[]).map((attachment: IAttachmentMeta, idx: number) => (
                        attachment.mimeType.startsWith('image/') && !HEIC_MIME_TYPES.has(attachment.mimeType) ? (
                            <ImageThumbnail key={idx} src={attachment.r2Url} alt={attachment.name} width={200} height={200} className={'rounded-lg max-w-48 max-h-48 object-contain'}/>
                        ) : (
                            <div key={idx} className={'flex items-center gap-2 rounded-lg bg-background/50 border border-border/50 px-3 py-2 w-fit'}>
                                <HiOutlineDocument className={'size-4 text-text-muted shrink-0'}/>
                                <span className={'text-xs font-medium text-text'}>{attachment.name}</span>
                            </div>
                        )
                    ))}
                </div>
            )}
            <MessageContent
                content={displayContent}
                sessionId={sessionId}
                messageId={message.messageId}
                onStubbed={onStubbed}
                toolUseMap={toolUseMap}
                toolResultMap={toolResultMap}
                pendingApprovalToolUseId={pendingApprovalToolUseId}
            />
        </BubbleShell>
    );
});

export {MessageBubble};
