import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";
import {CodeBlock} from "@/components/CodeBlock";
import type {ContentBlock} from "@/types/message";
import {ThinkingBlock} from "@/components/ThinkingBlock";
import {ToolCallBlock} from "@/components/ToolCallBlock";
import type {IMessageContentProps} from "@/types/components";

function MessageContent({content}: IMessageContentProps) {
    if (typeof content === 'string') {
        return (
            <Markdown remarkPlugins={[remarkGfm]} components={{code: renderCode}}>
                {content}
            </Markdown>
        );
    }

    return (
        <div className={'flex flex-col gap-3'}>
            {content.map((block: ContentBlock, index: number) => {
                switch (block.type) {
                    case 'thinking':
                        return <ThinkingBlock key={index} thinking={block.thinking}/>;
                    case 'text':
                        return (
                            <Markdown key={index} remarkPlugins={[remarkGfm]} components={{code: renderCode}}>
                                {block.text}
                            </Markdown>
                        );
                    case 'tool_use':
                        return <ToolCallBlock key={index} name={block.name} input={block.input}/>;
                    case 'tool_result':
                        return null;
                    default:
                        return null;
                }
            })}
        </div>
    );
}

function renderCode({className, children, ...props}: React.ComponentProps<'code'>) {
    const match: RegExpMatchArray | null = /language-(\w+)/.exec(className || '');

    if (match) {
        return (
            <CodeBlock code={String(children).replace(/\n$/, '')} language={match[1]}/>
        );
    }

    return (
        <code className={'px-1.5 py-0.5 rounded bg-code-bg text-xs font-mono'} {...props}>
            {children}
        </code>
    );
}

export {MessageContent};
