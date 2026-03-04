import React from "react";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";
import {CodeBlock} from "@/components/CodeBlock";
import type {IMemoryViewProps} from "@/types/components";
import {DeleteMemoryButton} from "@/components/DeleteMemoryButton";

function MemoryView({memory}: IMemoryViewProps) {
    const fileName: string = memory.filePath.split('/').pop() || memory.filePath;

    return (
        <div className={'flex flex-col h-full'}>
            {/* Memory header */}
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <div className={'flex items-center gap-1'}>
                    <h1 className={'text-sm font-semibold truncate'}>{fileName}</h1>
                    <div className={'ml-auto shrink-0'}>
                        <DeleteMemoryButton projectDir={memory.projectDir} fileName={fileName}/>
                    </div>
                </div>
                <p className={'text-xs text-text-muted mt-0.5'}>
                    <span>{memory.projectDir}</span>
                </p>
            </div>

            {/* Memory content */}
            <div className={'flex-1 overflow-y-auto px-6 py-4'}>
                <div className={'max-w-3xl mx-auto markdown-content text-sm'}>
                    <Markdown remarkPlugins={[remarkGfm]} components={{code: renderCode}}>
                        {memory.content}
                    </Markdown>
                </div>
            </div>
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

export {MemoryView};
