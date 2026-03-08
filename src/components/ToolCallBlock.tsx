"use client";

import React from "react";
import {HiOutlineCheck, HiOutlineChevronRight, HiOutlineClipboardCopy, HiOutlineTerminal} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IToolCallBlockProps} from "@/types/components";

function ToolCallBlock({name, input}: IToolCallBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [copied, setCopied] = React.useState<boolean>(false);

    const handleCopy = React.useCallback(async (): Promise<void> => {
        await navigator.clipboard.writeText(JSON.stringify(input, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [input]);

    return (
        <div className={'border border-border rounded-lg overflow-hidden'}>
            <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)} className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100'}>
                <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                <HiOutlineTerminal className={'size-3 text-text-muted'}/>
                <span className={'font-mono text-text-muted'}>{name}</span>
            </Button>
            {isOpen && (
                <div className={'relative px-3 pb-3'}>
                    <Button variant={'ghost'} size={'icon'} onClick={handleCopy} className={'absolute top-1 right-4 size-7 text-text-muted hover:text-text'} title={'Copy'}>
                        {copied
                            ? <HiOutlineCheck className={'size-3.5 text-success'}/>
                            : <HiOutlineClipboardCopy className={'size-3.5'}/>
                        }
                    </Button>
                    <pre className={'text-xs font-mono text-text-muted whitespace-pre-wrap bg-code-bg rounded-md p-3 pr-10 overflow-x-auto'}>
                        {JSON.stringify(input, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

export {ToolCallBlock};
