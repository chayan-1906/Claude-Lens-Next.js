"use client";

import React from "react";
import {cn} from "@/utils/cn";
import {MessageContent} from "@/components/MessageContent";
import {extractMessageText} from "@/utils/extractMessageText";
import type {IChatMessageBubbleProps} from "@/types/components";
import {CopyMessageButton} from "@/components/CopyMessageButton";

function ChatMessageBubble({message}: IChatMessageBubbleProps) {
    const isUser: boolean = message.role === 'user';
    const copyText: string = extractMessageText(message.content);

    return (
        <div className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm', isUser ? 'bg-user-bubble text-text' : 'bg-assistant-bubble text-text')}>
                <MessageContent content={message.content}/>
            </div>
            <div className={'flex items-center gap-2 mt-1 px-1'}>
                <span className={'text-[10px] text-text-muted'}>
                    {message.timestamp.toLocaleTimeString()}
                </span>
                {copyText && (
                    <CopyMessageButton text={copyText}/>
                )}
            </div>
        </div>
    );
}

export {ChatMessageBubble};
