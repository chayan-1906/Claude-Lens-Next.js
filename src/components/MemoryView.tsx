import React from "react";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";
import type {IMemoryViewProps} from "@/types/components";
import {renderCode, renderLink} from "@/components/CodeBlock";

function MemoryView({memory}: IMemoryViewProps) {
    const fileName: string = memory.filePath.split('/').pop() || memory.filePath;

    return (
        <div className={'flex flex-col'}>
            {/* Memory header */}
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <h1 className={'text-sm font-semibold truncate'}>{fileName}</h1>
            </div>

            {/* Memory content */}
            <div className={'px-6 py-4'}>
                <div className={'max-w-3xl mx-auto markdown-content text-sm'}>
                    <Markdown remarkPlugins={[remarkGfm]} components={{code: renderCode, a: renderLink}}>
                        {memory.content}
                    </Markdown>
                </div>
            </div>
        </div>
    );
}

export {MemoryView};
