import React from "react";
import {cn} from "@/utils/cn";
import type {IBubbleShellProps} from "@/types/components";

function BubbleShell({isUser, isSystemUser, isSubAgentPrompt, isSynthetic, hasNonTextBlock, metadata, children}: IBubbleShellProps) {
    const isPlainUser: boolean = isUser && !isSystemUser && !isSubAgentPrompt;

    const bubbleStyle: string = isSynthetic
        ? 'bg-warning/10 border border-warning/20 text-warning'
        : isSubAgentPrompt
            ? 'border border-primary/25 bg-primary/[0.04] text-text'
            : isPlainUser
                ? 'bg-user-bubble text-text'
                : 'bg-assistant-bubble text-text';

    return (
        <div className={cn('flex flex-col group', isPlainUser ? 'items-end' : 'items-start')}>
            <div className={cn(
                'flex flex-col gap-1 max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-4 text-sm',
                (isSubAgentPrompt || hasNonTextBlock) ? 'py-3' : 'py-2',
                bubbleStyle,
            )}>
                {children}
            </div>
            {metadata}
        </div>
    );
}

export {BubbleShell};
