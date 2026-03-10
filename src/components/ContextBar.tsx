"use client";

import React from "react";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IContextBarProps} from "@/types/components";

function formatTokenCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

function ContextBar({context}: IContextBarProps) {
    const [expanded, setExpanded] = React.useState<boolean>(false);

    const usagePercent: number = context.contextWindowMax ? Math.round((context.totalTokens / context.contextWindowMax) * 100) : 0;

    const barColor: string = usagePercent < 50 ? 'bg-success' : usagePercent < 80 ? 'bg-warning' : 'bg-error';

    // Don't render if no token data yet
    if (context.totalTokens === 0 && !context.model) return null;

    return (
        <div className={'border-t border-border bg-surface'}>
            {/* Collapsed view — always visible, single row */}
            <Button variant={'ghost'} size={'sm'} onClick={() => setExpanded((prev: boolean) => !prev)} className={'w-full px-4 py-1.5 flex items-center justify-between text-xs text-text-muted rounded-none active:bg-transparent active:scale-100'}>
                <div className={'flex items-center gap-3'}>
                    {/* Mini progress bar */}
                    <div className={'w-20 h-1.5 bg-border rounded-full overflow-hidden'}>
                        <div
                            className={cn('h-full rounded-full transition-all duration-300', barColor)}
                            style={{width: `${Math.min(usagePercent, 100)}%`}}
                        />
                    </div>
                    <span>
                        {`${formatTokenCount(context.totalTokens)} / ${formatTokenCount(context.contextWindowMax)} tokens (${usagePercent}%)`}
                    </span>
                </div>

                <div className={'flex items-center gap-3'}>
                    {context.filesInContext.length > 0 && (
                        <span>{context.filesInContext.length} files in context</span>
                    )}
                    {context.model && (
                        <span className={'font-mono'}>{context.model}</span>
                    )}
                    <span>{expanded ? '\u25BC' : '\u25B2'}</span>
                </div>
            </Button>

            {/* Expanded view — file list + token breakdown */}
            {expanded && (
                <div className={'px-4 py-2 border-t border-border text-xs'}>
                    <div className={'flex gap-8 mb-2'}>
                        <div>
                            <span className={'text-text-muted'}>Input:</span>
                            <span className={'font-mono'}>{formatTokenCount(context.inputTokens)}</span>
                        </div>
                        <div>
                            <span className={'text-text-muted'}>Output:</span>
                            <span className={'font-mono'}>{formatTokenCount(context.outputTokens)}</span>
                        </div>
                        <div>
                            <span className={'text-text-muted'}>Remaining:</span>
                            <span className={'font-mono'}>
                                ~{formatTokenCount(context.contextWindowMax - context.totalTokens)}
                            </span>
                        </div>
                    </div>

                    {context.filesInContext.length > 0 && (
                        <div>
                            <div className={'text-text-muted mb-1'}>Files in context:</div>
                            <div className={'flex flex-wrap gap-1'}>
                                {context.filesInContext.map((file: string) => (
                                    <span key={file} className={'px-2 py-0.5 bg-background border border-border rounded font-mono text-text-muted'} title={file}>
                                        {file.split('/').pop()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export {ContextBar};
