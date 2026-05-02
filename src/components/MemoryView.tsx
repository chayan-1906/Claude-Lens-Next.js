import React from "react";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";
import type {IMemoryViewProps} from "@/types/components";
import type {IFrontmatter, IParsedMemory} from "@/types/memory";
import {renderCode, renderLink, renderPre} from "@/components/CodeBlock";

const FRONTMATTER_REGEX: RegExp = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

const TYPE_BADGE_STYLES: Record<string, string> = {
    feedback: 'bg-warning/15 text-warning',
    user: 'bg-primary/10 text-primary',
    project: 'bg-success/15 text-success',
    reference: 'bg-accent/15 text-accent',
};

function parseFrontmatter(content: string): IParsedMemory {
    const match: RegExpMatchArray | null = content.match(FRONTMATTER_REGEX);
    if (!match) {
        return {frontmatter: {}, body: content};
    }

    const frontmatter: IFrontmatter = {};
    for (const line of match[1].split('\n')) {
        const colonIdx: number = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key: string = line.slice(0, colonIdx).trim();
        const value: string = line.slice(colonIdx + 1).trim();
        if (key === 'name') {
            frontmatter.name = value;
        } else if (key === 'description') {
            frontmatter.description = value;
        } else if (key === 'type') {
            frontmatter.type = value;
        } else if (key === 'originSessionId') {
            frontmatter.originSessionId = value;
        }
    }

    return {frontmatter, body: match[2].trim()};
}

function MemoryView({memory}: IMemoryViewProps) {
    const fileName: string = memory.filePath.split('/').pop() || memory.filePath;
    const {frontmatter, body}: IParsedMemory = parseFrontmatter(memory.content);
    const {name, description, type, originSessionId} = frontmatter;
    const hasFrontmatter: boolean = Object.keys(frontmatter).length > 0;

    return (
        <div className={'flex flex-col'}>
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <h1 className={'text-sm font-semibold truncate'}>{fileName}</h1>
            </div>

            <div className={'px-6 py-4'}>
                <div className={'max-w-3xl mx-auto text-sm'}>
                    {hasFrontmatter && (
                        <div className={'mb-5 p-4 rounded-lg border border-border bg-surface'}>
                            {type && (
                                <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full mb-2 ${TYPE_BADGE_STYLES[type] ?? 'bg-surface text-text-muted'}`}>
                                    {type}
                                </span>
                            )}
                            {name && (
                                <p className={'font-semibold text-text leading-snug'}>{name}</p>
                            )}
                            {description && (
                                <p className={'text-text-muted mt-1 leading-relaxed'}>{description}</p>
                            )}
                        </div>
                    )}
                    <div className={'markdown-content'}>
                        <Markdown remarkPlugins={[remarkGfm]} components={{code: renderCode, pre: renderPre, a: renderLink}}>
                            {hasFrontmatter ? body : memory.content}
                        </Markdown>
                    </div>
                </div>
            </div>
        </div>
    );
}

export {MemoryView};
