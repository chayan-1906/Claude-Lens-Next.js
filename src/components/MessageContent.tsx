import React from "react";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import Markdown from "react-markdown";
import type {ContentBlock, ParsedUserMessage, ToolResultBlock} from "@/types/message";
import {EUserMessageType} from "@/types/message";
import {renderCode} from "@/components/CodeBlock";
import {stripSystemTags} from "@/utils/stripSystemTags";
import {ThinkingBlock} from "@/components/ThinkingBlock";
import {ToolCallBlock} from "@/components/ToolCallBlock";
import {parseUserMessage} from "@/utils/parseUserMessage";
import type {IMessageContentProps} from "@/types/components";
import {ToolResultContentBlock} from "@/components/ToolResultContentBlock";

function MessageContent({content, sessionId, messageId, onStubbed}: IMessageContentProps) {
    if (typeof content === 'string') {
        return (
            renderStringContent(content)
        );
    }

    return (
        <div className={'flex flex-col'}>
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
                                <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{code: renderCode}}>
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
                        if (!sessionId || !messageId || !onStubbed) return null;
                        return (
                            <ToolResultContentBlock key={index} block={block as ToolResultBlock} sessionId={sessionId} messageId={messageId} onStubbed={onStubbed}/>
                        );

                    default:
                        return null;
                }
            })}
        </div>
    );
}

function renderStringContent(text: string): React.ReactNode {
    const parsed: ParsedUserMessage = parseUserMessage(text);

    switch (parsed.type) {
        case EUserMessageType.SLASH_COMMAND: {
            const label: string = parsed.args
                ? `${parsed.command} ${parsed.args}`
                : parsed.command;

            return (
                <div className={'flex flex-col gap-2 '}>
                    <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-mono w-fit'}>
                        ⚡{label}
                    </span>
                    {parsed.remainingText && (
                        <div className={'markdown-content'}>
                            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{code: renderCode}}>
                                {parsed.remainingText}
                            </Markdown>
                        </div>
                    )}
                </div>
            );
        }

        case EUserMessageType.COMMAND_OUTPUT:
            return (
                <pre className={'text-xs font-mono whitespace-pre-wrap bg-code-bg rounded-md p-3 text-text-muted overflow-x-auto'}>
                    {parsed.output}
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
                    <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={{code: renderCode}}>
                        {cleaned}
                    </Markdown>
                </div>
            );
        }
    }
}

export {MessageContent};
