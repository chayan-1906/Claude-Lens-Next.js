"use client";

import React from "react";
import {HiOutlineChevronRight, HiOutlineTerminal} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IToolCallBlockProps} from "@/types/components";

function ToolCallBlock({name, input}: IToolCallBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);

    return (
        <div className={'border border-border rounded-lg overflow-hidden'}>
            <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)} className={'flex items-center gap-2 w-full justify-start px-3 py-2 text-xs'}>
                <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                <HiOutlineTerminal className={'size-3 text-text-muted'}/>
                <span className={'font-mono text-text-muted'}>{name}</span>
            </Button>
            {isOpen && (
                <div className={'px-3 pb-3'}>
                    <pre className={'text-xs font-mono text-text-muted whitespace-pre-wrap bg-code-bg rounded-md p-3 overflow-x-auto'}>
                        {JSON.stringify(input, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

export {ToolCallBlock};
