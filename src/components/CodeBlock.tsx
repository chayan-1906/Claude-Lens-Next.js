"use client";

import React from "react";
import hljs from "highlight.js/lib/common";
import {TbCopy, TbCopyCheck} from "react-icons/tb";
import {Button} from "@/components/ui/Button";
import type {ICodeBlockProps} from "@/types/components";

function CodeBlock({code, language}: ICodeBlockProps) {
    const [copied, setCopied] = React.useState<boolean>(false);

    const highlighted: string = React.useMemo((): string => {
        if (language && hljs.getLanguage(language)) {
            return hljs.highlight(code, {language}).value;
        }
        return hljs.highlightAuto(code).value;
    }, [code, language]);

    const handleCopy = React.useCallback(async (): Promise<void> => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [code]);

    return (
        <div className={'relative rounded-lg overflow-hidden border border-code-border'}>
            {language && (
                <div className={'flex items-center justify-between px-3 py-1.5 bg-code-bg border-b border-code-border'}>
                    <span className={'text-xs font-mono text-text-muted'}>{language}</span>
                    <Button variant={'ghost'} size={'icon'} onClick={handleCopy} className={'size-7 text-text-muted hover:text-text'} title={'Copy'}>
                        {copied
                            ? <TbCopyCheck className={'size-3.5 text-success'}/>
                            : <TbCopy className={'size-3.5'}/>
                        }
                    </Button>
                </div>
            )}
            {!language && (
                <Button variant={'ghost'} size={'icon'} onClick={handleCopy} className={'absolute top-1 right-1 size-7 text-text-muted hover:text-text'} title={'Copy'}>
                    {copied
                        ? <TbCopyCheck className={'size-3.5 text-success'}/>
                        : <TbCopy className={'size-3.5'}/>
                    }
                </Button>
            )}
            <pre className={'p-3 bg-code-bg overflow-x-auto'}>
                <code className={'text-xs font-mono leading-relaxed'} dangerouslySetInnerHTML={{__html: highlighted}}/>
            </pre>
        </div>
    );
}

/** Shared Markdown code renderer — delegates fenced blocks to CodeBlock, renders inline code with theme tokens */
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

/** Shared Markdown anchor renderer — opens all links in a new tab with security attributes */
function renderLink({href, children, ...props}: React.ComponentProps<'a'>) {
    return (
        <a href={href} target={'_blank'} rel={'noopener noreferrer'} {...props}>
            {children}
        </a>
    );
}

export {CodeBlock, renderCode, renderLink};
