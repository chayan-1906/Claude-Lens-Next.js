"use client";

import React from "react";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";
import {renderCode} from "@/components/CodeBlock";
import type {IStreamingMessageProps} from "@/types/components";

function StreamingMessage({streamingText}: IStreamingMessageProps) {
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll as new content arrives, but stop if user scrolled up
    React.useEffect(() => {
        if (containerRef.current) {
            const scrollContainer: HTMLElement | null = containerRef.current.closest('.chat-scroll-container');
            if (scrollContainer) {
                const isNearBottom: boolean =
                    scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 150;
                if (isNearBottom) {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight;
                }
            }
        }
    }, [streamingText]);

    if (!streamingText) return null;

    return (
        <div ref={containerRef} className={'flex flex-col items-start'}>
            <div className={'max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-assistant-bubble text-text'}>
                <div className={'markdown-content'}>
                    <Markdown remarkPlugins={[remarkGfm]} components={{code: renderCode}}>
                        {streamingText}
                    </Markdown>
                </div>
                {/* Blinking cursor at the end while streaming */}
                <span className={'inline-block w-1.5 h-4 bg-text-muted animate-pulse ml-0.5 align-text-bottom rounded-sm'}/>
            </div>
        </div>
    );
}

export {StreamingMessage};
