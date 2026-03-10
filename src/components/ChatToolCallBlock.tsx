"use client";

import React from "react";
import {HiOutlineCheck, HiOutlineChevronRight, HiOutlineClipboardCopy, HiOutlineTerminal} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IChatToolCallBlockProps} from "@/types/components";

function ChatToolCallBlock({name, input, result, isError, isRunning}: IChatToolCallBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [copied, setCopied] = React.useState<boolean>(false);

    const handleCopy = React.useCallback(async (): Promise<void> => {
        const copyText: string = result
            ? `Input:\n${JSON.stringify(input, null, 2)}\n\nOutput:\n${result}`
            : JSON.stringify(input, null, 2);
        await navigator.clipboard.writeText(copyText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [input, result]);

    return (
        <div className={'border border-border rounded-lg overflow-hidden my-2'}>
            {/* Header — always visible */}
            <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)} className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100'}>
                <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                {isRunning ? (
                    <svg className={'animate-spin size-3 text-primary'} viewBox={'0 0 24 24'} fill={'none'}>
                        <circle className={'opacity-25'} cx={'12'} cy={'12'} r={'10'} stroke={'currentColor'} strokeWidth={'4'}/>
                        <path className={'opacity-75'} fill={'currentColor'} d={'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'}/>
                    </svg>
                ) : (
                    <HiOutlineTerminal className={cn('size-3', isError ? 'text-error' : 'text-success')}/>
                )}
                <span className={'font-mono text-text-muted'}>{name}</span>
                {!isRunning && !isError && (
                    <HiOutlineCheck className={'size-3 text-success ml-auto'}/>
                )}
            </Button>

            {/* Expandable body — shows input/output */}
            {isOpen && (
                <div className={'relative px-3 pb-3 border-t border-border'}>
                    <Button variant={'ghost'} size={'icon'} onClick={handleCopy} className={'absolute top-1 right-4 size-7 text-text-muted hover:text-text'} title={'Copy'}>
                        {copied
                            ? <HiOutlineCheck className={'size-3.5 text-success'}/>
                            : <HiOutlineClipboardCopy className={'size-3.5'}/>
                        }
                    </Button>

                    <div className={'text-xs text-text-muted mt-2 mb-1'}>Input:</div>
                    <pre className={'text-xs font-mono text-text-muted whitespace-pre-wrap bg-code-bg rounded-md p-3 pr-10 overflow-x-auto'}>
                        {JSON.stringify(input, null, 2)}
                    </pre>

                    {result !== undefined && (
                        <>
                            <div className={'text-xs text-text-muted mt-2 mb-1'}>{'Output:'}</div>
                            <pre className={cn(
                                'text-xs font-mono whitespace-pre-wrap bg-code-bg rounded-md p-3 overflow-x-auto max-h-48 overflow-y-auto',
                                isError ? 'text-error' : 'text-text-muted',
                            )}>
                                {result}
                            </pre>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export {ChatToolCallBlock};
