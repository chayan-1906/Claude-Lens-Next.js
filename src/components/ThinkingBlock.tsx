"use client";

import React from "react";
import {HiOutlineChevronRight} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IThinkingBlockProps} from "@/types/components";

function ThinkingBlock({thinking}: IThinkingBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);

    return (
        <div className={'border border-border rounded-lg overflow-hidden'}>
            <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)} className={'flex items-center gap-2 w-full justify-start px-3 py-2 text-xs text-text-muted'}>
                <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                <span>{'Thinking...'}</span>
            </Button>
            {isOpen && (
                <div className={'px-3 pb-3 text-xs text-text-muted whitespace-pre-wrap font-mono leading-relaxed'}>
                    {thinking}
                </div>
            )}
        </div>
    );
}

export {ThinkingBlock};
