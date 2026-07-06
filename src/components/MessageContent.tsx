import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";
import {HiOutlineDocument, HiOutlinePhotograph} from "react-icons/hi";
import {stripAnsiCodes} from "@/utils/stripAnsiCodes";
import {IMessageContentProps} from "@/types/components";
import {stripSystemTags} from "@/utils/stripSystemTags";
import {parseUserMessage} from "@/utils/parseUserMessage";
import {ImageThumbnail} from "@/components/ImageThumbnail";
import {preserveSingleNewlines} from "@/utils/preserveSingleNewlines";
import {renderCode, renderLink, renderPre} from "@/components/CodeBlock";
import {ContentBlock, DocumentBlock, EUserMessageType, ImageBlock, ParsedUserMessage, ToolResultBlock} from "@/types/message";
import {FILE_ATTACHED_REGEX, IMAGE_EXTENSION_REGEX, IMAGE_RESIZE_ANNOTATION_REGEX, LOCAL_IMAGE_REF_REGEX} from "@/utils/constants";

// Lazy load heavy sub-components via next/dynamic — only loaded when the block type is actually rendered
const lazyLoadingFallback = (
    <div className={'flex items-start'}>
        <div className={'rounded-2xl px-4 py-3 bg-assistant-bubble flex items-center gap-1.5'}>
            <span className={'size-1.5 rounded-full bg-primary'} style={{animation: 'claude-dot 0.8s infinite', animationDelay: '0ms'}}/>
            <span className={'size-1.5 rounded-full bg-primary'} style={{animation: 'claude-dot 0.8s infinite', animationDelay: '120ms'}}/>
            <span className={'size-1.5 rounded-full bg-primary'} style={{animation: 'claude-dot 0.8s infinite', animationDelay: '240ms'}}/>
        </div>
    </div>
);

const ThinkingBlock = dynamic(
    () => import("@/components/ThinkingBlock").then((m) => m.ThinkingBlock),
    {loading: () => lazyLoadingFallback},
);
const ToolCallBlock = dynamic(
    () => import("@/components/ToolCallBlock").then((m) => m.ToolCallBlock),
    {loading: () => lazyLoadingFallback},
);
const ToolResultContentBlock = dynamic(
    () => import("@/components/ToolResultContentBlock").then((m) => m.ToolResultContentBlock),
    {loading: () => lazyLoadingFallback},
);

const markdownComponents = {code: renderCode, pre: renderPre, a: renderLink};

const HEIC_MIME_TYPES: Set<string> = new Set(['image/heic', 'image/heif']);


/** Renders a styled card for files uploaded to R2 (non-image, non-PDF attachments) */
function FileAttachmentCard({fileName}: { fileName: string }): React.ReactElement {
    return (
        <div className={'flex items-center gap-2 rounded-lg bg-background/50 border border-border/50 px-3 py-2 w-fit'}>
            <HiOutlineDocument className={'size-4 text-text-muted shrink-0'}/>
            <span className={'text-xs font-medium text-text'}>{fileName}</span>
        </div>
    );
}

/** Renders a local-file placeholder (image or document) that can't be fetched remotely */
function LocalFilePlaceholder({filePath}: { filePath: string }): React.ReactElement {
    const fileName: string = filePath.split('/').pop() ?? filePath;
    const isImage: boolean = IMAGE_EXTENSION_REGEX.test(fileName);
    return (
        <div className={'flex items-center gap-2 rounded-lg bg-background/50 border border-border/50 px-3 py-2 w-fit'}>
            {isImage
                ? <HiOutlinePhotograph className={'size-4 text-text-muted shrink-0'}/>
                : <HiOutlineDocument className={'size-4 text-text-muted shrink-0'}/>
            }
            <span className={'text-xs font-medium text-text-muted'}>{fileName}</span>
        </div>
    );
}

const MessageContent = React.memo(function MessageContent({content, sessionId, messageId, onStubbed, toolUseMap, toolResultMap, pendingApprovalToolUseId}: IMessageContentProps) {
    if (typeof content === 'string') {
        return (
            renderStringContent(content)
        );
    }

    return (
        <div className={'flex flex-col gap-2'}>
            {content.map((block: ContentBlock, index: number) => {
                switch (block.type) {
                    case 'thinking':
                        return (
                            <ThinkingBlock key={index} block={block} sessionId={sessionId} messageId={messageId} onStubbed={onStubbed}/>
                        );

                    case 'text': {
                        const cleaned: string = stripSystemTags(block.text);
                        if (!cleaned) return null;

                        // Claude Code's image resize annotation — useless to the user, hide it
                        if (IMAGE_RESIZE_ANNOTATION_REGEX.test(cleaned.trim())) {
                            return null;
                        }

                        // Local image reference written by Claude Code terminal: "[Image: source: /path]"
                        const localRef: RegExpExecArray | null = LOCAL_IMAGE_REF_REGEX.exec(cleaned.trim());
                        if (localRef) {
                            return <LocalFilePlaceholder key={index} filePath={localRef[1]}/>;
                        }

                        // Backend-generated attachment reference for non-image, non-PDF files:
                        // "File attached: filename — https://..." — render as a styled card
                        const fileAttachMatch: RegExpExecArray | null = FILE_ATTACHED_REGEX.exec(cleaned.trim());
                        if (fileAttachMatch) {
                            return <FileAttachmentCard key={index} fileName={fileAttachMatch[1]}/>;
                        }

                        return (
                            <div key={index} className={'markdown-content'}>
                                <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                    {cleaned}
                                </Markdown>
                            </div>
                        );
                    }

                    case 'tool_use': {
                        if (pendingApprovalToolUseId && block.id === pendingApprovalToolUseId) {
                            return null;
                        }
                        return (
                            <ToolCallBlock key={index} name={block.name} input={block.input} toolResult={toolResultMap?.get(block.id)}/>
                        );
                    }

                    case 'tool_result': {
                        const toolResultBlock = block as ToolResultBlock;
                        const toolUse = toolUseMap?.get(toolResultBlock.tool_use_id);
                        return (
                            <ToolResultContentBlock key={index} block={toolResultBlock} toolUse={toolUse} sessionId={sessionId} messageId={messageId} onStubbed={onStubbed}/>
                        );
                    }

                    case 'image': {
                        const source = (block as ImageBlock).source;

                        // Path A — URL-based image (e.g. R2 public URL)
                        if (source?.type === 'url') {
                            const imageUrl: string = source.url;
                            const isRemote: boolean = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
                            if (!imageUrl || !isRemote) {
                                return <LocalFilePlaceholder key={index} filePath={imageUrl || 'image'}/>;
                            }
                            return (
                                <ImageThumbnail
                                    key={index}
                                    src={imageUrl}
                                    alt={'Attachment'}
                                    width={300}
                                    height={300}
                                    className={'rounded-lg max-w-72 max-h-72 object-contain'}
                                />
                            );
                        }

                        // Path B — base64-encoded image (Claude CLI uploads)
                        if (source?.type === 'base64' && source.data && source.media_type) {
                            // Browsers cannot render HEIC/HEIF natively — show a named placeholder
                            if (HEIC_MIME_TYPES.has(source.media_type)) {
                                const extension: string = source.media_type.split('/')[1];
                                return (
                                    <LocalFilePlaceholder key={index} filePath={`image.${extension}`}/>
                                );
                            }
                            const dataUri: string = `data:${source.media_type};base64,${source.data}`;
                            return (
                                <ImageThumbnail
                                    key={index}
                                    src={dataUri}
                                    alt={'Attachment'}
                                    width={300}
                                    height={300}
                                    className={'rounded-lg max-w-72 max-h-72 object-contain'}
                                />
                            );
                        }

                        return <LocalFilePlaceholder key={index} filePath={'image'}/>;
                    }

                    case 'document':
                        return (
                            <a key={index} href={(block as DocumentBlock).source.url} target={'_blank'} rel={'noopener noreferrer'}
                               className={'flex items-center gap-2 rounded-lg bg-background/50 border border-border/50 px-3 py-2 w-fit hover:bg-background transition-colors'}>
                                <HiOutlineDocument className={'size-4 text-text-muted'}/>
                                <span className={'text-xs font-medium text-primary'}>PDF Document</span>
                            </a>
                        );

                    default:
                        return null;
                }
            })}
        </div>
    );
});

function renderStringContent(text: string): React.ReactNode {
    const parsed: ParsedUserMessage = parseUserMessage(text);

    switch (parsed.type) {
        case EUserMessageType.SLASH_COMMAND: {
            const label: string = parsed.args
                ? `${parsed.command} ${parsed.args}`
                : parsed.command;

            return (
                <div className={'flex flex-col gap-2 py-3'}>
                    <span className={'inline-flex items-center px-3 py-2 rounded-full bg-primary/15 text-primary text-xs font-mono font-semibold w-fit'}>
                        ⚡{label}
                    </span>
                    {parsed.remainingText && (
                        <div className={'markdown-content'}>
                            <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {preserveSingleNewlines(parsed.remainingText)}
                            </Markdown>
                        </div>
                    )}
                </div>
            );
        }

        case EUserMessageType.COMMAND_OUTPUT:
            return (
                <pre className={'text-xs font-mono whitespace-pre-wrap bg-code-bg rounded-md p-3 my-3 text-text-muted overflow-x-auto'}>
                    {stripAnsiCodes(parsed.output)}
                </pre>
            );

        case EUserMessageType.SYSTEM_CAVEAT:
            return null;

        case EUserMessageType.PLAIN:
        default: {
            const cleaned: string = stripSystemTags(parsed.text);
            if (!cleaned) return null;

            // Claude Code's image resize annotation — useless to the user, hide it
            if (IMAGE_RESIZE_ANNOTATION_REGEX.test(cleaned.trim())) {
                return null;
            }

            // Local image reference written by Claude Code terminal: "[Image: source: /path]"
            const localRef: RegExpExecArray | null = LOCAL_IMAGE_REF_REGEX.exec(cleaned.trim());
            if (localRef) {
                return <LocalFilePlaceholder filePath={localRef[1]}/>;
            }

            return (
                <div className={'markdown-content'}>
                    <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {preserveSingleNewlines(cleaned)}
                    </Markdown>
                </div>
            );
        }
    }
}

export {MessageContent};
