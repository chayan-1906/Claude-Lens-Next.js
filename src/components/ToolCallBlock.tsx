"use client";

import React from "react";
import {HiOutlineChevronRight, HiOutlineTerminal} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IToolCallBlockProps} from "@/types/components";
import {CopyMessageButton} from "@/components/CopyMessageButton";

function ToolCallBlock({name, input}: IToolCallBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);

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
                        {JSON.stringify(input, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}

export {ToolCallBlock};
