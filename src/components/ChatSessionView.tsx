"use client";

import React from "react";
import {useRouter} from "next/navigation";
import {HiOutlineExclamationCircle, HiOutlineFolder, HiOutlineRefresh, HiOutlineWifi} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {routes} from "@/utils/routes";
import type {ContentBlock, IMessage, ThinkingBlock, ToolResultBlock} from "@/types/message";
import {EMessageRole} from "@/types/message";
import {Button} from "@/components/ui/Button";
import {ChatInput} from "@/components/ChatInput";
import {ContextBar} from "@/components/ContextBar";
import {useClaudeChat} from "@/hooks/useClaudeChat";
import {EChatStatus, IChatMessage} from "@/types/chat";
import {formatModelName} from "@/utils/formatModelName";
import {openFolderPicker} from "@/actions/file.actions";
import type {IGetSessionResponse} from "@/types/session";
import {MessageBubble} from "@/components/MessageBubble";
import {MessageContent} from "@/components/MessageContent";
import {ScrollToBottom} from "@/components/ScrollToBottom";
import type {IOpenFolderPickerResponse} from "@/types/file";
import type {IChatSessionViewProps} from "@/types/components";
import {extractMessageText} from "@/utils/extractMessageText";
import {CopyMessageButton} from "@/components/CopyMessageButton";
import {InlineMessageEditor} from "@/components/InlineMessageEditor";
import {DeleteSessionButton} from "@/components/DeleteSessionButton";
import {getSession, refreshSidebar} from "@/actions/session.actions";

function ChatSessionView({isNewChat, session, historicalMessages}: IChatSessionViewProps) {
    const router = useRouter();
    const {status, messages, streamingContent, contextInfo, error, retryable, forkedSessionId, sendMessage, editMessage, regenerateMessage, stopExecution, retry} = useClaudeChat();

    // Refs to ensure post-first-response actions run only once
    const hasUpdatedUrlRef = React.useRef<boolean>(false);
    const hasSyncedSidebarRef = React.useRef<boolean>(false);

    // Local copy of historical messages — enables optimistic stub updates without a full page refresh
    const [localHistoricalMessages, setLocalHistoricalMessages] = React.useState<IMessage[]>(historicalMessages ?? []);

    // Edit state: which message is being edited, and how many historical messages to show
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [historicalCutoffIndex, setHistoricalCutoffIndex] = React.useState<number | null>(null);

    // Project directory state for new chats
    const [projectDir, setProjectDir] = React.useState<string>('');
    const [isBrowsing, setIsBrowsing] = React.useState<boolean>(false);
    const [isRefreshingMessages, setIsRefreshingMessages] = React.useState<boolean>(false);

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
                window.dispatchEvent(new CustomEvent('session-created'));
                console.log('[ChatSessionView] Sidebar refreshed!');
            }, 2000);
            return (): void => {
                clearTimeout(timeoutId);
            };
        }
    }, [isNewChat, messages, status]);

    // Redirect to forked session after response completes and sync finishes.
    // IMPORTANT: Must NOT replaceState during streaming — SidebarClient uses usePathname(),
    // and changing the [sessionId] param mid-stream triggers Next.js soft navigation,
    // which destroys the component tree (WebSocket + claude process killed by SIGTERM).
    // NOTE: No cleanup function — the timeout must survive effect re-runs (e.g. process_exit
    // changing status after result). The ref guard ensures it's scheduled only once.
    const hasRedirectedForkRef = React.useRef<boolean>(false);
    React.useEffect(() => {
        if (!forkedSessionId || status !== EChatStatus.IDLE || hasRedirectedForkRef.current) return;
        hasRedirectedForkRef.current = true;
        console.log(`[ChatSessionView] edit_session complete — navigating to forked session ${forkedSessionId} (5s delay for sync)`);
        setTimeout((): void => {
            router.replace(routes.sessionPath(forkedSessionId));
        }, 5000);
    }, [forkedSessionId, status, router]);

    // True while Claude is actively responding — blocks new input and edit triggers
    const isChattingDisabled: boolean = status === EChatStatus.STREAMING
        || status === EChatStatus.TOOL_RUNNING
        || status === EChatStatus.CONNECTING
        || status === EChatStatus.OFFLINE;

    // Main ChatInput disabled while chatting OR while an edit is in progress
    const disabled: boolean = isChattingDisabled || editingId !== null;

    const isLoading: boolean = status === EChatStatus.SENDING
        || status === EChatStatus.STREAMING
        || status === EChatStatus.TOOL_RUNNING;

    const handleSend = React.useCallback((text: string): void => {
        console.log(`[ChatSessionView] handleSend — text:`, text.slice(0, 50));
        sendMessage(text, isNewChat ? {projectDir: projectDir || undefined} : {sessionId: session?.sessionId});
    }, [sendMessage, isNewChat, session?.sessionId, projectDir]);

    const handleHistoricalEditSave = React.useCallback((newText: string, historicalIndex: number): void => {
        setHistoricalCutoffIndex(historicalIndex);
        const editAtUuid: string | undefined = historicalIndex > 0
            ? localHistoricalMessages[historicalIndex - 1]?.uuid
            : undefined;
        editMessage(0, newText, isNewChat ? undefined : {sessionId: session?.sessionId, editAtUuid});
        setEditingId(null);
    }, [editMessage, isNewChat, session?.sessionId, localHistoricalMessages]);

    const handleLiveEditSave = React.useCallback((newText: string, liveIndex: number): void => {
        // editAtUuid: look at the live message just before the edit point, or fall back to last historical UUID
        const editAtUuid: string | undefined = liveIndex > 0
            ? messages[liveIndex - 1]?.uuid
            : localHistoricalMessages[localHistoricalMessages.length - 1]?.uuid;
        editMessage(liveIndex, newText, isNewChat ? undefined : {sessionId: session?.sessionId, editAtUuid});
        setEditingId(null);
    }, [editMessage, isNewChat, session?.sessionId, messages, localHistoricalMessages]);

    // Regenerate is allowed only when IDLE, no edit in progress, and not streaming
    const canRegenerate: boolean = status === EChatStatus.IDLE && editingId === null && !streamingContent;
    // const visibleHistoricalLength: number = historicalCutoffIndex ?? (historicalMessages?.length ?? 0);

    const handleLiveRegenerate = React.useCallback((clickedIndex: number): void => {
        let lastUserIndex: number = -1;
        let lastUserText: string = '';
        for (let i: number = clickedIndex - 1; i >= 0; i--) {
            if (messages[i].role === EMessageRole.USER) {
                lastUserIndex = i;
                lastUserText = extractMessageText(messages[i].content);
                break;
            }
        }
        if (lastUserIndex === -1 || !lastUserText) return;
        // editAtUuid: message just before the user message being resent, or last historical UUID
        const editAtUuid: string | undefined = lastUserIndex > 0
            ? messages[lastUserIndex - 1]?.uuid
            : localHistoricalMessages[localHistoricalMessages.length - 1]?.uuid;
        regenerateMessage(lastUserIndex + 1, lastUserText, isNewChat ? undefined : {sessionId: session?.sessionId, editAtUuid});
    }, [messages, localHistoricalMessages, regenerateMessage, isNewChat, session?.sessionId]);

    const handleHistoricalRegenerate = React.useCallback((clickedIndex: number): void => {
        const visibleHistorical: IMessage[] = localHistoricalMessages.slice(0, historicalCutoffIndex ?? undefined);
        if (!visibleHistorical.length) return;
        let lastUserIndex: number = -1;
        let lastUserText: string = '';
        for (let i: number = clickedIndex - 1; i >= 0; i--) {
            if (visibleHistorical[i].role === EMessageRole.USER) {
                lastUserIndex = i;
                lastUserText = extractMessageText(visibleHistorical[i].content);
                break;
            }
        }
        if (lastUserIndex === -1 || !lastUserText) return;
        setHistoricalCutoffIndex(lastUserIndex + 1);
        // editAtUuid: message just before the user message being resent
        const editAtUuid: string | undefined = lastUserIndex > 0
            ? visibleHistorical[lastUserIndex - 1]?.uuid
            : undefined;
        regenerateMessage(0, lastUserText, isNewChat ? undefined : {sessionId: session?.sessionId, editAtUuid});
    }, [localHistoricalMessages, historicalCutoffIndex, regenerateMessage, isNewChat, session?.sessionId]);

    const handleBrowse = React.useCallback(async (): Promise<void> => {
        setIsBrowsing(true);
        const result: IOpenFolderPickerResponse = await openFolderPicker();
        setIsBrowsing(false);
        if (result.success && result.path) {
            setProjectDir(result.path);
        }
    }, []);

    const handleRefreshMessages = React.useCallback(async (): Promise<void> => {
        const sessionId: string | undefined = session?.sessionId;
        if (!sessionId) {
            return;
        }
        setIsRefreshingMessages(true);
        const result: IGetSessionResponse = await getSession({sessionId});
        if (result.success && result.messages) {
            setLocalHistoricalMessages(result.messages);
            setHistoricalCutoffIndex(null);
            console.log(`[ChatSessionView] Messages refreshed — ${result.messages.length} messages loaded`);
        }
        setIsRefreshingMessages(false);
    }, [session?.sessionId]);

    const handleStubbed = React.useCallback((messageId: string): void => {
        setLocalHistoricalMessages((prev: IMessage[]) => prev.map((message: IMessage) => {
            if (message.messageId !== messageId) return message;
            return {
                ...message,
                content: (message.content as ContentBlock[]).map((block: ContentBlock) => {
                    if (block.type === 'tool_result' && !(block as ToolResultBlock)._stubbed) {
                        const tokenCount: number = Math.round((block as ToolResultBlock).content.length / 4);
                        return {
                            ...block,
                            content: `[content removed — was ~${tokenCount} tokens]`,
                            _stubbed: true,
                            _originalTokenCount: tokenCount,
                        } as ToolResultBlock;
                    }
                    if (block.type === 'thinking' && !(block as ThinkingBlock)._stubbed) {
                        const tokenCount: number = Math.round((block as ThinkingBlock).thinking.length / 4);
                        return {
                            ...block,
                            thinking: `[thinking removed — was ~${tokenCount} tokens]`,
                            _stubbed: true,
                            _originalTokenCount: tokenCount,
                        } as ThinkingBlock;
                    }
                    return block;
                }),
            };
        }));
    }, []);

    const hasNoMessages: boolean = !localHistoricalMessages.length && messages.length === 0 && !streamingContent;
    const showThinking: boolean = (status === EChatStatus.SENDING || status === EChatStatus.CONNECTING) && !streamingContent;

    // Derive token usage from the last historical assistant message as a fallback
    const historicalTokenUsage = React.useMemo((): { input: number; output: number } | null => {
        if (!localHistoricalMessages.length) return null;
        for (let i: number = localHistoricalMessages.length - 1; i >= 0; i--) {
            const msg: IMessage = localHistoricalMessages[i];
            if (msg.role === EMessageRole.ASSISTANT && msg.tokenUsage) {
                return msg.tokenUsage;
            }
        }
        return null;
    }, [localHistoricalMessages]);

    // When contextInfo exists but tokens are still 0 (system event fired, no usage data yet),
    // hold the historical values until live token data arrives from the assistant event.
    const historicalInput: number = session?.contextTokensUsed ?? historicalTokenUsage?.input ?? 0;
    const historicalOutput: number = historicalTokenUsage?.output ?? 0;
    const inputTokens: number = contextInfo && contextInfo.inputTokens > 0
        ? contextInfo.inputTokens
        : historicalInput;
    const outputTokens: number = contextInfo && contextInfo.outputTokens > 0
        ? contextInfo.outputTokens
        : historicalOutput;
    const contextWindow: number | null = contextInfo?.contextWindow && contextInfo.contextWindow > 0
        ? contextInfo.contextWindow
        : session?.contextWindowSize && session.contextWindowSize > 0
            ? session.contextWindowSize
            : null;
    const hasContextData: boolean = contextInfo !== null
        || inputTokens > 0
        || outputTokens > 0
        || contextWindow !== null;

    return (
        <div className={'flex flex-col h-full'}>
            {/* Reconnecting banner — shown immediately when connection drops mid-session */}
            {(status === EChatStatus.CONNECTING && messages.length > 0) && (
                <div className={'flex items-center gap-2 px-4 py-2 bg-warning/10 border-b border-warning/20 text-warning text-xs shrink-0'}>
                    <HiOutlineWifi className={'size-4 shrink-0'}/>
                    <span>Reconnecting to server...</span>
                </div>
            )}

            {/* Offline banner — shown after all reconnect attempts exhausted */}
            {status === EChatStatus.OFFLINE && (
                <div className={'flex items-center gap-2 px-4 py-2 bg-error/10 border-b border-error/20 text-error text-xs shrink-0'}>
                    <HiOutlineWifi className={'size-4 shrink-0'}/>
                    <span>Connection lost. Unable to reconnect!</span>
                    {retryable && (
                        <Button variant={'danger'} size={'sm'} onClick={retry} className={'ml-auto flex items-center gap-1 cursor-pointer'}>
                            <HiOutlineRefresh className={'size-3'}/>
                            Retry
                        </Button>
                    )}
                </div>
            )}

            {/* Header (existing sessions only) */}
            {session && (
                <div className={'flex px-6 py-3 items-center justify-between border-b border-border shrink-0'}>
                    <div className={'flex flex-col justify-center'}>
                        <div className={'flex gap-2 items-end'}>
                            <h1 className={'text-sm font-semibold truncate text-primary'}>{session.title}</h1>
                            <p className={'text-xs text-primary/80 font-semibold'}>({session.rawProjectDir})</p>
                        </div>

                        <div className={'flex items-center gap-1 text-xs text-primary'}>
                            {session.aiModel && (
                                <span>{session.aiModel}</span>
                            )}
                            {(session.aiModel && session.gitBranch) && (
                                <span>•</span>
                            )}{session.gitBranch && (
                            <span>{session.gitBranch}</span>
                        )}
                        </div>
                    </div>

                    <div className={'flex items-center gap-2 shrink-0'}>
                        <Button variant={'ghost'} size={'icon'} onClick={handleRefreshMessages} disabled={isRefreshingMessages || isChattingDisabled} className={'size-7 text-text-muted'}
                                title={'Refresh session'}>
                            <HiOutlineRefresh className={cn('size-3.5', isRefreshingMessages && 'animate-spin')}/>
                        </Button>
                        <DeleteSessionButton sessionId={session.sessionId} sessionTitle={session.title}/>
                        <span
                            className={cn('size-2.5 rounded-full', status === EChatStatus.CONNECTING ? 'bg-warning' : status === EChatStatus.ERROR || status === EChatStatus.OFFLINE ? 'bg-error' : 'bg-success')}/>
                    </div>
                </div>
            )}

            {/* Project directory input for new chats */}
            {(isNewChat && !session && messages.length === 0) && (
                <div className={'px-6 py-4 border-b border-border bg-surface shrink-0'}>
                    <label className={'block text-xs text-text-muted mb-1.5'}>{'Project directory (optional)'}</label>
                    <div className={'flex items-center gap-2'}>
                        <input
                            type={'text'}
                            value={projectDir}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectDir(e.target.value)}
                            placeholder={'/Users/you/projects/my-app'}
                            className={'flex-1 px-3 py-2 text-sm font-mono bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'}
                        />
                        <Button variant={'secondary'} size={'sm'} onClick={handleBrowse} isLoading={isBrowsing} disabled={isBrowsing}>
                            <HiOutlineFolder className={'size-4'}/>
                            Browse...
                        </Button>
                    </div>
                </div>
            )}

            {/* Messages area */}
            <div className={'flex-1 overflow-y-auto px-6 py-4'}>
                <div className={'max-w-3xl mx-auto flex flex-col gap-4'}>
                    {/* Historical messages — sliced at edit cutoff when user edits from history */}
                    {localHistoricalMessages.slice(0, historicalCutoffIndex ?? undefined).map((message: IMessage, index: number) => {
                        const isUser: boolean = message.role === EMessageRole.USER;

                        if (editingId === message.uuid) {
                            return (
                                <div key={message.uuid} className={'flex flex-col items-end'}>
                                    <InlineMessageEditor
                                        initialText={extractMessageText(message.content)}
                                        disabled={isChattingDisabled}
                                        onSave={(newText: string) => handleHistoricalEditSave(newText, index)}
                                        onCancel={() => setEditingId(null)}
                                    />
                                </div>
                            );
                        }

                        const showHistoricalRegenerate: boolean = !isUser && canRegenerate;

                        return (
                            <MessageBubble
                                key={message.uuid}
                                message={message}
                                index={index}
                                sessionId={session?.sessionId}
                                onEdit={(isUser && !isChattingDisabled && editingId === null) ? () => setEditingId(message.uuid) : undefined}
                                onRegenerate={showHistoricalRegenerate ? handleHistoricalRegenerate : undefined}
                                onStubbed={handleStubbed}
                            />
                        );
                    })}

                    {/* Live messages (user + finalized assistant) */}
                    {messages.map((message: IChatMessage, index: number) => {
                        const isUser: boolean = message.role === EMessageRole.USER;

                        if (editingId === message.id) {
                            return (
                                <div key={message.id} className={'flex flex-col items-end'}>
                                    <InlineMessageEditor
                                        initialText={extractMessageText(message.content)}
                                        disabled={isChattingDisabled}
                                        onSave={(newText: string) => handleLiveEditSave(newText, index)}
                                        onCancel={() => setEditingId(null)}
                                    />
                                </div>
                            );
                        }

                        const copyText: string = extractMessageText(message.content);
                        return (
                            <div key={message.id} className={cn('flex flex-col group', isUser ? 'items-end' : 'items-start')}>
                                <div className={cn('max-w-[85%] rounded-2xl px-4 py-0 text-sm', isUser ? 'bg-user-bubble text-text' : 'bg-assistant-bubble text-text')}>
                                    <MessageContent content={message.content}/>
                                </div>
                                <div className={'flex items-center gap-2 mt-1 px-1'}>
                                    {/*{(isUser && !isChattingDisabled && editingId === null) && (
                                        <Button variant={'ghost'} size={'icon'} onClick={() => setEditingId(message.id)} title={'Edit message'}
                                                className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'}>
                                            <HiOutlinePencil className={'size-3.5'}/>
                                        </Button>
                                    )}*/}
                                    {/*{(() => {
                                        const showLiveRegenerate: boolean = !isUser && canRegenerate;
                                        return showLiveRegenerate ? (
                                            <Button variant={'ghost'} size={'icon'} onClick={() => handleLiveRegenerate(index)} title={'Regenerate response'}
                                                    className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'}>
                                                <HiOutlineRefresh className={'size-3.5'}/>
                                            </Button>
                                        ) : null;
                                    })()}*/}
                                    {copyText && (
                                        <CopyMessageButton text={copyText}/>
                                    )}
                                    {(!isUser && message.model) && (
                                        <span className={'text-xs text-text-muted italic'}>
                                            Prepared using {formatModelName(message.model)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Streaming assistant response */}
                    {streamingContent && (
                        <div className={'flex flex-col items-start'}>
                            <div className={'max-w-[85%] rounded-2xl px-4 py-0 text-sm bg-assistant-bubble text-text'}>
                                <MessageContent content={streamingContent}/>
                            </div>
                        </div>
                    )}

                    {/* Thinking dots — waiting for first token */}
                    {showThinking && (
                        <div className={'flex items-start'}>
                            <div className={'rounded-2xl px-4 py-3 bg-assistant-bubble flex items-center gap-1.5'}>
                                <span className={'size-1.5 rounded-full bg-text-muted animate-bounce'} style={{animationDelay: '0ms'}}/>
                                <span className={'size-1.5 rounded-full bg-text-muted animate-bounce'} style={{animationDelay: '150ms'}}/>
                                <span className={'size-1.5 rounded-full bg-text-muted animate-bounce'} style={{animationDelay: '300ms'}}/>
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {status === EChatStatus.ERROR && error && (
                        <div className={'flex items-start gap-2 rounded-2xl px-4 py-3 bg-error/10 border border-error/20 text-error text-sm'}>
                            <HiOutlineExclamationCircle className={'size-4 shrink-0 mt-0.5'}/>
                            <span className={'flex-1'}>{error}</span>
                            {retryable && (
                                <Button variant={'link'} size={'sm'} onClick={retry} className={'shrink-0'}>
                                    <HiOutlineRefresh className={'size-3'}/>
                                    Retry
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Empty state for new chats */}
                    {(isNewChat && hasNoMessages && status === EChatStatus.IDLE) && (
                        <p className={'text-sm text-text-muted text-center py-8'}>Start a new conversation</p>
                    )}

                    <ScrollToBottom trigger={`${messages.length}-${streamingContent?.length ?? 0}`}/>
                </div>
            </div>

            {/* Context info + Chat input */}
            <div className={'max-w-3xl mx-auto w-full'}>
                {hasContextData && (
                    <ContextBar inputTokens={inputTokens} outputTokens={outputTokens} contextWindow={contextWindow}/>
                )}
                <ChatInput onSend={handleSend} onStop={stopExecution} disabled={disabled} isLoading={isLoading}/>
            </div>
        </div>
    );
}

export {ChatSessionView};
