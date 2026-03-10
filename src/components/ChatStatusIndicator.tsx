"use client";

import React from "react";
import {EChatStatus} from "@/types/chat";
import {Button} from "@/components/ui/Button";
import type {IChatStatusIndicatorProps} from "@/types/components";

function ChatStatusIndicator({state, onRetry}: IChatStatusIndicatorProps) {
    switch (state.status) {
        case EChatStatus.CONNECTING:
            return (
                <div className={'text-warning text-sm px-4 py-2'}>
                    Connecting to backend...
                </div>
            );

        case EChatStatus.SENDING:
            return (
                <div className={'flex items-center gap-1 text-text-muted py-3 px-4'}>
                    <div className={'flex gap-1'}>
                        <span className={'size-2 bg-text-muted rounded-full animate-bounce [animation-delay:0ms]'}/>
                        <span className={'size-2 bg-text-muted rounded-full animate-bounce [animation-delay:150ms]'}/>
                        <span className={'size-2 bg-text-muted rounded-full animate-bounce [animation-delay:300ms]'}/>
                    </div>
                    <span className={'ml-2 text-sm'}>{'Claude is thinking...'}</span>
                </div>
            );

        case EChatStatus.STREAMING:
            return null;

        case EChatStatus.TOOL_RUNNING:
            return (
                <div className={'text-sm text-primary flex items-center gap-2 py-2 px-4'}>
                    <svg className={'animate-spin size-4'} viewBox={'0 0 24 24'} fill={'none'}>
                        <circle className={'opacity-25'} cx={'12'} cy={'12'} r={'10'} stroke={'currentColor'} strokeWidth={'4'}/>
                        <path className={'opacity-75'} fill={'currentColor'} d={'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'}/>
                    </svg>
                    <span>Running tool: {state.toolName}</span>
                </div>
            );

        case EChatStatus.ERROR:
            return (
                <div className={'text-error text-sm bg-error/10 p-3 rounded-lg mx-4 flex items-center gap-2'}>
                    <span>{state.message}</span>
                    {onRetry && (
                        <Button variant={'link'} size={'sm'} onClick={onRetry} className={'text-error underline'}>
                            Retry
                        </Button>
                    )}
                </div>
            );

        case EChatStatus.OFFLINE:
            return (
                <div className={'text-warning text-sm bg-warning/10 p-3 rounded-lg mx-4'}>
                    Backend offline — read-only mode
                    <span className={'text-text-muted ml-1'}>Start your local server to chat</span>
                </div>
            );

        default:
            return null;
    }
}

export {ChatStatusIndicator};
