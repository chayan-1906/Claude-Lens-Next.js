"use client";

import React from "react";
import {HiOutlineCheck, HiOutlineClipboardCopy} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import type {ICodeBlockProps} from "@/types/components";

function CodeBlock({code, language}: ICodeBlockProps) {
    const [copied, setCopied] = React.useState<boolean>(false);

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
                            ? <HiOutlineCheck className={'size-3.5 text-success'}/>
                            : <HiOutlineClipboardCopy className={'size-3.5'}/>
                        }
                    </Button>
                </div>
            )}
            {!language && (
                <Button variant={'ghost'} size={'icon'} onClick={handleCopy} className={'absolute top-1 right-1 size-7 text-text-muted hover:text-text'} title={'Copy'}>
                    {copied
                        ? <HiOutlineCheck className={'size-3.5 text-success'}/>
                        : <HiOutlineClipboardCopy className={'size-3.5'}/>
                    }
                </Button>
            )}
            <pre className={'p-3 bg-code-bg overflow-x-auto'}>
                <code className={'text-xs font-mono text-text leading-relaxed'}>{code}</code>
            </pre>
        </div>
    );
}

export {CodeBlock};