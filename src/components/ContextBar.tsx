"use client";

import React from "react";
import {HiOutlineChevronDown, HiOutlineChevronUp} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {debug} from "@/utils/debug";
import {Button} from "@/components/ui/Button";
import type {IContextBarProps} from "@/types/components";

function formatTokenCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

function ContextBar({inputTokens, outputTokens, contextWindow}: IContextBarProps) {
    const [expanded, setExpanded] = React.useState<boolean>(false);

    const consumed: number = inputTokens;
    const usagePercent: number = contextWindow && contextWindow > 0
        ? Math.round((consumed / contextWindow) * 100)
        : 0;
    const remaining: number | null = contextWindow !== null ? contextWindow - consumed : null;

    const barColor: string = usagePercent < 50 ? 'bg-success' : usagePercent < 80 ? 'bg-warning' : 'bg-error';

    debug('ContextBar:', {consumed, usagePercent, remaining, inputTokens, contextWindow});

    return (
        <div className={'border-t border-border rounded-t-xl bg-surface select-none'}>
            {/* Collapsed view — always visible, single row */}
            <Button variant={'ghost'} size={'sm'} onClick={() => setExpanded((prev: boolean) => !prev)}
                    className={'w-full px-4 py-1.5 flex items-center justify-between text-xs text-text-muted rounded-none active:bg-transparent active:scale-100'}>
                <div className={'flex items-center gap-3'}>
                    {/* Mini progress bar — fixed width, left-anchored */}
                    {contextWindow !== null && (
                        <div className={'w-20 h-1.5 bg-border rounded-full overflow-hidden shrink-0'}>
                            <div className={cn('h-full rounded-full transition-all duration-300', barColor)} style={{width: `${Math.min(usagePercent, 100)}%`}}/>
                        </div>
                    )}
                    <span>
                        {contextWindow !== null
                            ? `${formatTokenCount(consumed)} / ${formatTokenCount(contextWindow)} tokens (${usagePercent}%)`
                            : `${formatTokenCount(consumed)} tokens used`
                        }
                    </span>
                </div>

                {expanded ? <HiOutlineChevronUp/> : <HiOutlineChevronDown/>}
            </Button>

            {/* Expanded view — token breakdown */}
            {expanded && (
                <div className={'px-4 py-2 border-t border-border text-xs'}>
                    <div className={'flex gap-8'}>
                        <div className={'flex gap-1.5'}>
                            <span className={'text-text-muted'}>Input:</span>
                            <span className={'font-mono'}>{formatTokenCount(inputTokens)}</span>
                        </div>
                        <div className={'flex gap-1.5'}>
                            <span className={'text-text-muted'}>Output:</span>
                            <span className={'font-mono'}>{formatTokenCount(outputTokens)}</span>
                        </div>
                        {remaining !== null && (
                            <div className={'flex gap-1.5'}>
                                <span className={'text-text-muted'}>Remaining:</span>
                                <span className={'font-mono'}>~{formatTokenCount(remaining)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export {ContextBar};
