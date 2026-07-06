"use client";

import React from "react";
import {HiOutlineChevronRight, HiOutlineTerminal} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import {DiffView} from "@/components/DiffView";
import {getDiffStats} from "@/utils/diffUtils";
import type {IToolCallBlockProps} from "@/types/components";
import {CopyMessageButton} from "@/components/CopyMessageButton";

const ToolCallBlock = React.memo(function ToolCallBlock({name, input, toolResult}: IToolCallBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(true);

    if (name === 'Edit') {
        const filePath: string = (input.file_path as string) ?? '';
        const fileName: string = filePath.split('/').pop() ?? filePath;
        const oldString: string = (input.old_string as string) ?? '';
        const newString: string = (input.new_string as string) ?? '';
        const {added, removed} = getDiffStats(oldString, newString);
        const label: string = !toolResult ? 'Editing...' : toolResult.is_error ? 'Edit failed' : 'Edited';
        const labelClass: string = toolResult?.is_error ? 'font-mono text-error shrink-0' : 'font-mono text-text-muted shrink-0';

        return (
            <div className={'border border-primary/30 rounded-lg overflow-hidden'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100 gap-1.5'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform shrink-0', isOpen && 'rotate-90')}/>
                    <span className={'text-text-muted shrink-0'}>✎</span>
                    <span className={labelClass}>{label}</span>
                    <span className={'font-mono text-text truncate flex-1 text-left'}>{fileName}</span>
                    <span className={'font-mono text-success shrink-0'}>+{added}</span>
                    <span className={'font-mono text-error shrink-0 mr-1'}>-{removed}</span>
                </Button>
                {isOpen && (
                    <div className={'border-t border-primary/20'}>
                        <DiffView toolName={'Edit'} filePath={filePath} oldString={oldString} newString={newString}/>
                    </div>
                )}
            </div>
        );
    }

    if (name === 'Write') {
        const filePath: string = (input.file_path as string) ?? '';
        const fileName: string = filePath.split('/').pop() ?? filePath;
        const content: string = (input.content as string) ?? '';
        const label: string = !toolResult ? 'Creating…' : toolResult.is_error ? 'Write failed' : 'Created';
        const labelClass: string = toolResult?.is_error ? 'font-mono text-error shrink-0' : 'font-mono text-text-muted shrink-0';

        return (
            <div className={'border border-primary/30 rounded-lg overflow-hidden'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100 gap-1.5'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform shrink-0', isOpen && 'rotate-90')}/>
                    <span className={'text-text-muted shrink-0'}>📄</span>
                    <span className={labelClass}>{label}</span>
                    <span className={'font-mono text-text truncate flex-1 text-left'}>{fileName}</span>
                </Button>
                {isOpen && (
                    <div className={'border-t border-primary/20'}>
                        <DiffView toolName={'Write'} filePath={filePath} content={content}/>
                    </div>
                )}
            </div>
        );
    }

    if (name === 'Bash') {
        const command: string = (input.command as string) ?? '';
        const description: string = (input.description as string) ?? '';

        return (
            <div className={'border border-primary/30 rounded-lg overflow-hidden'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100 gap-1.5'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform shrink-0', isOpen && 'rotate-90')}/>
                    <HiOutlineTerminal className={'size-3 text-text-muted shrink-0'}/>
                    <span className={'font-mono text-text-muted shrink-0'}>Bash</span>
                    {description && (
                        <span className={'font-mono text-text truncate flex-1 text-left'}>{description}</span>
                    )}
                </Button>
                {isOpen && (
                    <div className={'relative px-3 pb-3'}>
                        <div className={'absolute right-4 top-1'}>
                            <CopyMessageButton text={command}/>
                        </div>
                        <pre className={'text-xs font-mono text-text-muted whitespace-pre-wrap bg-code-bg rounded-md p-3 pr-10 overflow-x-auto'}>
                            <span className={'text-primary select-none'}>$ </span>{command}
                        </pre>
                    </div>
                )}
            </div>
        );
    }

    if (name === 'Read') {
        const filePath: string = (input.file_path as string) ?? '';
        const fileName: string = filePath.split('/').pop() ?? filePath;

        return (
            <div className={'border border-primary/30 rounded-lg overflow-hidden'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100 gap-1.5'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform shrink-0', isOpen && 'rotate-90')}/>
                    <span className={'text-text-muted shrink-0'}>📖</span>
                    <span className={'font-mono text-text-muted shrink-0'}>Read</span>
                    <span className={'font-mono text-text truncate flex-1 text-left'}>{fileName}</span>
                </Button>
                {isOpen && (
                    <div className={'relative px-3 pb-3'}>
                        <div className={'absolute right-4 top-1'}>
                            <CopyMessageButton text={JSON.stringify(input, null, 2)}/>
                        </div>
                        <pre className={'text-xs font-mono text-text-muted whitespace-pre-wrap bg-code-bg rounded-md p-3 pr-10 overflow-x-auto'}>
                            {JSON.stringify(input, null, 2) || '{}'}
                        </pre>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={'border border-primary/30 rounded-lg overflow-hidden'}>
            <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)} className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100'}>
                <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                <HiOutlineTerminal className={'size-3 text-text-muted'}/>
                <span className={'font-mono text-text-muted'}>{name}</span>
            </Button>
            {isOpen && (
                <div className={'relative px-3 pb-3'}>
                    <div className={'absolute right-4 top-1'}>
                        <CopyMessageButton text={JSON.stringify(input, null, 2)}/>
                    </div>
                    <pre className={'text-xs font-mono text-text-muted whitespace-pre-wrap bg-code-bg rounded-md p-3 pr-10 overflow-x-auto'}>
                        {JSON.stringify(input, null, 2) || '{}'}
                    </pre>
                </div>
            )}
        </div>
    );
});

export {ToolCallBlock};
