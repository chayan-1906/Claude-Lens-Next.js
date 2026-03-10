"use client";

import React from "react";
import {useRouter} from "next/navigation";
import {cn} from "@/utils/cn";
import {routes} from "@/utils/routes";
import type {IMessage} from "@/types/message";
import {ChatInput} from "@/components/ChatInput";
import {ContextBar} from "@/components/ContextBar";
import {useClaudeChat} from "@/hooks/useClaudeChat";
import {EChatStatus, IChatMessage} from "@/types/chat";
import {refreshSidebar} from "@/actions/session.actions";
import {ModelSwitcher} from "@/components/ModelSwitcher";
import {IChatSessionViewProps} from "@/types/components";
import {MessageBubble} from "@/components/MessageBubble";
import {StreamingMessage} from "@/components/StreamingMessage";
import {ChatMessageBubble} from "@/components/ChatMessageBubble";
import {ChatToolCallBlock} from "@/components/ChatToolCallBlock";
import {ChatStatusIndicator} from "@/components/ChatStatusIndicator";
import {DeleteSessionButton} from "@/components/DeleteSessionButton";

function ChatSessionView({session, historicalMessages, isNewChat}: IChatSessionViewProps) {
    const router = useRouter();
    const sessionIdRef = React.useRef<string | null>(null);

    const handleProcessExit = React.useCallback(async (): Promise<void> => {
        console.log('[handleProcessExit] sessionIdRef:', sessionIdRef.current);
        await refreshSidebar();
        console.log('[handleProcessExit] refreshSidebar done');
        if (sessionIdRef.current) {
            console.log('[handleProcessExit] router.replace to', routes.sessionPath(sessionIdRef.current));
            router.replace(routes.sessionPath(sessionIdRef.current));
        }
    }, [router]);

    const {chatState, messages: liveMessages, contextInfo, toolCalls, sessionId, isStreaming, isOnline, connect, sendMessage, setMessages, reset} = useClaudeChat(handleProcessExit);

    const [projectDir, setProjectDir] = React.useState<string>(session?.projectDir || '');
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const historicalCountRef = React.useRef<number>(historicalMessages?.length ?? 0);

    const handleSend = React.useCallback((text: string): void => {
        console.log('[handleSend] session:', session?.sessionId, '| liveSessionId:', sessionId);
        if (session) {
            // Existing MongoDB session — resume by its sessionId
            sendMessage(text, {resumeSessionId: session.sessionId});
        } else if (sessionId) {
            // Live session already started — resume using the captured sessionId
            sendMessage(text, {resumeSessionId: sessionId});
        } else {
            // First message of a new chat
            sendMessage(text, {projectDir: projectDir || undefined});
        }
    }, [session, sessionId, projectDir, sendMessage]);

    const handleRetry = React.useCallback((): void => {
        connect();
    }, [connect]);

    // Reset hook state when entering a new chat — guards against stale Router Cache
    React.useEffect(() => {
        if (isNewChat && !session) {
            reset();
        }
    }, [isNewChat, session, reset]);

    // Keep sessionId ref in sync for the process exit callback
    React.useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    // NOTE: URL stays as /c/new during the live chat.
    // router.replace in handleProcessExit updates it properly after sync completes.

    // When historicalMessages grows (after auto-sync + refreshSidebar), clear live duplicates
    React.useEffect(() => {
        const newCount: number = historicalMessages?.length ?? 0;
        if (newCount > historicalCountRef.current) {
            setMessages([]);
        }
        historicalCountRef.current = newCount;
    }, [historicalMessages, setMessages]);

    // Connect WebSocket on mount
    React.useEffect(() => {
        connect();
    }, [connect]);

    const title: string = session?.title || 'New Chat';

    return (
        <div className={'flex flex-col h-full'}>
            {/* Header */}
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <div className={'flex items-center gap-1'}>
                    <h1 className={'text-sm font-semibold truncate'}>{title}</h1>
                    {session && (
                        <span className={'text-sm'}>({session.projectDir})</span>
                    )}
                    <div className={'ml-auto shrink-0 flex items-center gap-2'}>
                        <ModelSwitcher model={contextInfo.model}/>
                        <span className={cn('size-2 rounded-full shrink-0', isOnline ? 'bg-success' : 'bg-error')}/>
                        {session && (
                            <DeleteSessionButton sessionId={session.sessionId} sessionTitle={session.title}/>
                        )}
                    </div>
                </div>
                {session && (
                    <p className={'text-xs text-text-muted mt-0.5'}>
                        {session.aiModel && (
                            <span>{session.aiModel}</span>
                        )}
                        {(session.aiModel && session.gitBranch) && (
                            <span> • </span>
                        )}
                        {session.gitBranch && (
                            <span>{session.gitBranch}</span>
                        )}
                    </p>
                )}
            </div>

            {/* Project directory input for new chats */}
            {(isNewChat && !session && liveMessages.length === 0) && (
                <div className={'px-6 py-4 border-b border-border bg-surface'}>
                    <label className={'block text-xs text-text-muted mb-1.5'}>Project directory (optional)</label>
                    <input
                        type={'text'}
                        value={projectDir}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectDir(e.target.value)}
                        placeholder={'/Users/you/projects/my-app'}
                        className={'w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'}
                    />
                </div>
            )}

            {/* Messages area — scrollable */}
            <div ref={scrollContainerRef} className={'flex-1 overflow-y-auto chat-scroll-container'}>
                <div className={'max-w-3xl mx-auto px-4 py-6 flex flex-col gap-4'}>
                    {/* Historical messages (from MongoDB) */}
                    {historicalMessages?.map((message: IMessage) => (
                        <MessageBubble key={message.uuid} message={message}/>
                    ))}

                    {/* Live chat messages */}
                    {liveMessages.map((message: IChatMessage, index: number) => (
                        <ChatMessageBubble key={`live-${index}`} message={message}/>
                    ))}

                    {/* Tool call blocks (during streaming) */}
                    {toolCalls.length > 0 && (
                        <div className={'flex flex-col items-start'}>
                            <div className={'max-w-[85%]'}>
                                {toolCalls.map(({id, name, input, result, isError, isRunning}) => (
                                    <ChatToolCallBlock key={id} name={name} input={input} result={result} isError={isError} isRunning={isRunning}/>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Streaming response */}
                    {chatState.status === EChatStatus.STREAMING && (
                        <StreamingMessage streamingText={chatState.text}/>
                    )}

                    {/* Status indicators */}
                    <ChatStatusIndicator state={chatState} onRetry={handleRetry}/>
                </div>
            </div>

            {/* Context bar — above input */}
            <ContextBar context={contextInfo}/>

            {/* Chat input — fixed at bottom */}
            <ChatInput onSend={handleSend} isStreaming={isStreaming} isOnline={isOnline}/>
        </div>
    );
}

export {ChatSessionView};
