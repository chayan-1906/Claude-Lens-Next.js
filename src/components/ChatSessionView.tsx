"use client";

import React from "react";
import {useRouter} from "next/navigation";
import {cn} from "@/utils/cn";
import {routes} from "@/utils/routes";
import type {IChatMessage} from "@/types/chat";
import {EChatStatus} from "@/types/chat";
import type {IMessage} from "@/types/message";
import {EMessageRole} from "@/types/message";
import {ChatInput} from "@/components/ChatInput";
import {useClaudeChat} from "@/hooks/useClaudeChat";
import {MessageBubble} from "@/components/MessageBubble";
import {refreshSidebar} from "@/actions/session.actions";
import {MessageContent} from "@/components/MessageContent";
import {ScrollToBottom} from "@/components/ScrollToBottom";
import type {IChatSessionViewProps} from "@/types/components";
import {extractMessageText} from "@/utils/extractMessageText";
import {CopyMessageButton} from "@/components/CopyMessageButton";

function ChatSessionView({isNewChat, session, historicalMessages}: IChatSessionViewProps) {
    const router = useRouter();
    const {status, messages, streamingContent, contextInfo, sendMessage} = useClaudeChat();

    // Refs to ensure post-first-response actions run only once
    const hasUpdatedUrlRef = React.useRef<boolean>(false);
    const hasSyncedSidebarRef = React.useRef<boolean>(false);

    console.log(`[ChatSessionView] Render — isNewChat: ${isNewChat}, sessionId: ${session?.sessionId ?? contextInfo?.sessionId ?? 'none'}, status: ${status}, liveMessages: ${messages.length}, streaming: ${streamingContent !== null}, historicalMessages: ${historicalMessages?.length ?? 0}`);

    // Update URL from /c/new → /c/{sessionId} as soon as system event provides the sessionId
    React.useEffect(() => {
        if (isNewChat && contextInfo?.sessionId && !hasUpdatedUrlRef.current) {
            hasUpdatedUrlRef.current = true;
            const newUrl: string = routes.sessionPath(contextInfo.sessionId);
            console.log(`[ChatSessionView] Updating URL → ${newUrl}`);
            window.history.replaceState(null, '', newUrl);
        }
    }, [isNewChat, contextInfo?.sessionId]);

    // Refresh sidebar after first response completes (with delay for backend auto-sync)
    React.useEffect(() => {
        const hasAssistantMessage: boolean = messages.some((m: IChatMessage) => m.role === EMessageRole.ASSISTANT);
        if (isNewChat && hasAssistantMessage && status === EChatStatus.IDLE && !hasSyncedSidebarRef.current) {
            hasSyncedSidebarRef.current = true;
            console.log('[ChatSessionView] First response complete — refreshing sidebar (2s delay for auto-sync)');
            const timeoutId: ReturnType<typeof setTimeout> = setTimeout(async (): Promise<void> => {
                await refreshSidebar();
                router.refresh();
                console.log('[ChatSessionView] Sidebar refreshed');
            }, 2000);
            return (): void => {
                clearTimeout(timeoutId);
            };
        }
    }, [isNewChat, messages, status, router]);

    const disabled: boolean = status === EChatStatus.STREAMING
        || status === EChatStatus.TOOL_RUNNING
        || status === EChatStatus.CONNECTING;

    const isLoading: boolean = status === EChatStatus.SENDING
        || status === EChatStatus.CONNECTING;

    const handleSend = React.useCallback((text: string): void => {
        console.log(`[ChatSessionView] handleSend — text:`, text.slice(0, 50));
        sendMessage(text, isNewChat ? undefined : {sessionId: session?.sessionId});
    }, [sendMessage, isNewChat, session?.sessionId]);

    const hasNoMessages: boolean = !historicalMessages?.length && messages.length === 0 && !streamingContent;

    return (
        <div className={'flex flex-col h-full'}>
            {/* Header (existing sessions only) */}
            {session && (
                <div className={'px-6 py-3 border-b border-border shrink-0'}>
                    <h1 className={'text-sm font-semibold truncate'}>{session.title}</h1>
                    <p className={'text-xs text-text-muted mt-0.5'}>
                        {session.aiModel && <span>{session.aiModel}</span>}
                        {session.aiModel && session.gitBranch && <span>{' • '}</span>}
                        {session.gitBranch && <span>{session.gitBranch}</span>}
                    </p>
                </div>
            )}

            {/* Messages area */}
            <div className={'flex-1 overflow-y-auto px-6 py-4'}>
                <div className={'max-w-3xl mx-auto flex flex-col gap-4'}>
                    {/* Historical messages */}
                    {historicalMessages?.map((message: IMessage) => (
                        <MessageBubble key={message.uuid} message={message}/>
                    ))}

                    {/* Live messages (user + finalized assistant) */}
                    {messages.map((message: IChatMessage) => {
                        const isUser: boolean = message.role === EMessageRole.USER;
                        const copyText: string = extractMessageText(message.content);

                        return (
                            <div key={message.id} className={cn('flex flex-col', isUser ? 'items-end' : 'items-start')}>
                                <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm', isUser ? 'bg-user-bubble text-text' : 'bg-assistant-bubble text-text')}>
                                    <MessageContent content={message.content}/>
                                </div>
                                {copyText && (
                                    <div className={'flex items-center gap-2 mt-1 px-1'}>
                                        <CopyMessageButton text={copyText}/>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Streaming assistant response */}
                    {streamingContent && (
                        <div className={'flex flex-col items-start'}>
                            <div className={'max-w-[85%] rounded-2xl px-4 py-3 text-sm bg-assistant-bubble text-text'}>
                                <MessageContent content={streamingContent}/>
                            </div>
                        </div>
                    )}

                    {/* Empty state for new chats */}
                    {(isNewChat && hasNoMessages && status === EChatStatus.IDLE) && (
                        <p className={'text-sm text-text-muted text-center py-8'}>Start a new conversation</p>
                    )}

                    <ScrollToBottom trigger={`${messages.length}-${streamingContent?.length ?? 0}`}/>
                </div>
            </div>

            {/* Chat input */}
            <div className={'max-w-3xl mx-auto w-full'}>
                <ChatInput onSend={handleSend} disabled={disabled} isLoading={isLoading}/>
            </div>
        </div>
    );
}

export {ChatSessionView};
