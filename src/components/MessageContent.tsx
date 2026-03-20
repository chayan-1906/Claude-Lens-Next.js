import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";
import {stripAnsiCodes} from "@/utils/stripAnsiCodes";
import {IMessageContentProps} from "@/types/components";
import {stripSystemTags} from "@/utils/stripSystemTags";
import {parseUserMessage} from "@/utils/parseUserMessage";
import {renderCode, renderLink} from "@/components/CodeBlock";
import {ContentBlock, EUserMessageType, ParsedUserMessage, ToolResultBlock} from "@/types/message";

// Lazy load heavy sub-components via next/dynamic — only loaded when the block type is actually rendered
const lazyLoadingFallback = (
    <div className={'flex items-center gap-1.5 px-3 py-2'}>
        <span className={'size-1.5 rounded-full bg-text-muted animate-bounce'} style={{animationDelay: '0ms'}}/>
        <span className={'size-1.5 rounded-full bg-text-muted animate-bounce'} style={{animationDelay: '150ms'}}/>
        <span className={'size-1.5 rounded-full bg-text-muted animate-bounce'} style={{animationDelay: '300ms'}}/>
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

const MessageContent = React.memo(function MessageContent({content, sessionId, messageId, onStubbed}: IMessageContentProps) {
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
                        return (
                            <div key={index} className={'markdown-content'}>
                                <Markdown remarkPlugins={[remarkGfm]} components={{code: renderCode, a: renderLink}}>
                                    {cleaned}
                                </Markdown>
                            </div>
                        );
                    }

                    case 'tool_use':
                        return (
                            <ToolCallBlock key={index} name={block.name} input={block.input}/>
                        );

                    case 'tool_result':
                        return (
                            <ToolResultContentBlock key={index} block={block as ToolResultBlock} sessionId={sessionId} messageId={messageId} onStubbed={onStubbed}/>
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
                            <Markdown remarkPlugins={[remarkGfm]} components={{code: renderCode, a: renderLink}}>
                                {parsed.remainingText}
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
            return (
                <div className={'markdown-content'}>
                    <Markdown remarkPlugins={[remarkGfm]} components={{code: renderCode, a: renderLink}}>
                        {cleaned}
                    </Markdown>
                </div>
            );
        }
    }
}

export {MessageContent};
