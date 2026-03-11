"use client";

import React from "react";
import {HiOutlineChevronRight} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IContextBarProps} from "@/types/components";

function formatTokenCount(count: number): string {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
}

function ContextBar({inputTokens, outputTokens, contextWindow}: IContextBarProps) {
    const [isExpanded, setIsExpanded] = React.useState<boolean>(false);

    const consumed: number = inputTokens + outputTokens;
    const remaining: number | null = contextWindow !== null ? contextWindow - consumed : null;
    const percentage: number | null = contextWindow !== null && contextWindow > 0
        ? Math.min((consumed / contextWindow) * 100, 100)
        : null;

    const progressColorClass: string = percentage === null
        ? 'bg-success'
        : percentage < 50 ? 'bg-success'
            : percentage < 80 ? 'bg-warning'
                : 'bg-error';

    return (
        <div className={'px-3 py-1.5 select-none'}>
            {/* Collapsed summary — always visible */}
            <Button variant={'ghost'} size={'sm'} onClick={() => setIsExpanded((prev: boolean) => !prev)}
                    className={'w-full flex items-center gap-2.5 px-0 h-auto py-1 hover:bg-transparent active:bg-transparent active:scale-100'}>
                {/* Progress bar (only when contextWindow is known) */}
                {percentage !== null && (
                    <div className={'flex-1 h-1.5 rounded-full bg-border overflow-hidden'}>
                        <div className={cn('h-full rounded-full transition-all duration-500', progressColorClass)} style={{width: `${percentage}%`}}/>
                    </div>
                )}

                {/* Token summary + percentage */}
                <span className={'text-[11px] text-text-muted whitespace-nowrap'}>
                    {contextWindow !== null
                        ? `${formatTokenCount(consumed)} / ${formatTokenCount(contextWindow)} (${percentage!.toFixed(1)}%)`
                        : `${formatTokenCount(consumed)} used`
                    }
                </span>

                {/* Expand/collapse chevron */}
                <HiOutlineChevronRight
                    className={cn(
                        'size-3 text-text-muted transition-transform duration-200 shrink-0',
                        isExpanded && 'rotate-90',
                    )}
                />
            </Button>

            {/* Expanded details */}
            {isExpanded && (
                <div className={'mt-2 space-y-2 pb-1'}>
                    {/* Token breakdown */}
                    <div className={'flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted'}>
                        <span>Input: {formatTokenCount(inputTokens)}</span>
                        <span>Output: {formatTokenCount(outputTokens)}</span>
                        {remaining !== null && (
                            <span>Remaining: {formatTokenCount(remaining)}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export {ContextBar};
