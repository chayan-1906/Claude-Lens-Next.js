"use client";
"use no memo"; // useVirtualizer returns mutable refs incompatible with React Compiler auto-memoization

import React from "react";
import {useRouter} from "next/navigation";
import {FaArrowDown} from "react-icons/fa";
import {useVirtualizer, VirtualItem} from "@tanstack/react-virtual";
import {HiOutlineBeaker, HiOutlineChevronDoubleRight, HiOutlineCode, HiOutlineFolder, HiOutlineRefresh, HiOutlineSearch, HiOutlineTerminal, HiOutlineWifi} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {debug} from "@/utils/debug";
import {routes} from "@/utils/routes";
import {Button} from "@/components/ui/Button";
import {ChatInput} from "@/components/ChatInput";
import {useClaudeChat} from "@/hooks/useClaudeChat";
import {BubbleShell} from "@/components/BubbleShell";
import {IOpenFolderPickerResponse} from "@/types/file";
import {formatModelName} from "@/utils/formatModelName";
import {openFolderPicker} from "@/actions/file.actions";
import {IChatSessionViewProps} from "@/types/components";
import {MessageBubble} from "@/components/MessageBubble";
import {ImageThumbnail} from "@/components/ImageThumbnail";
import {MessageContent} from "@/components/MessageContent";
import {IGetSessionResponse, ISession} from "@/types/session";
import {CopyMessageButton} from "@/components/CopyMessageButton";
import {ToolApprovalPrompt} from "@/components/ToolApprovalPrompt";
import {RenameSessionModal} from "@/components/RenameSessionModal";
import {EChatStatus, IAttachment, IChatMessage} from "@/types/chat";
import {InlineMessageEditor} from "@/components/InlineMessageEditor";
import {DeleteSessionButton} from "@/components/DeleteSessionButton";
import {getSession, refreshSidebar} from "@/actions/session.actions";
import {extractMessageText, normalizeToolResultContent} from "@/utils/extractMessageText";
import {ContentBlock, EMessageRole, IMessage, TextBlock, ThinkingBlock, ToolResultBlock, ToolUseBlock} from "@/types/message";

function ChatSessionView({isNewChat, session, historicalMessages}: IChatSessionViewProps) {
    const router = useRouter();
    const {
        status, messages, streamingContent, contextInfo, ideStatus, error, retryable, forkedSessionId, pendingApproval,
        sendMessage, editMessage, regenerateMessage, respondToApproval, switchModel, stopExecution, retry, clearMessages, clearError,
    } = useClaudeChat();

    // Refs to ensure post-first-response actions run only once
    const hasUpdatedUrlRef = React.useRef<boolean>(false);
    const hasSyncedSidebarRef = React.useRef<boolean>(false);
    const hasPostSyncRefetchedRef = React.useRef<boolean>(false);

    // Auto-scroll refs
    const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
    const isAtBottomRef = React.useRef<boolean>(true);

    // Local copy of historical messages — enables optimistic stub updates without a full page refresh
    const [localHistoricalMessages, setLocalHistoricalMessages] = React.useState<IMessage[]>(historicalMessages ?? []);

    // Edit state: which message is being edited, and how many historical messages to show
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [historicalCutoffIndex, setHistoricalCutoffIndex] = React.useState<number | null>(null);

    // History readiness guard — prevents sends before all state is settled after mount.
    // On client-side navigation (e.g. clicking a session in the sidebar right after import),
    // props may still be streaming from the server component. This ensures the component
    // is fully hydrated with historicalMessages before the user can send.
    const [isHistoryReady, setIsHistoryReady] = React.useState<boolean>(isNewChat);

    React.useEffect(() => {
        if (!isNewChat && historicalMessages !== undefined) {
            setIsHistoryReady(true);
        }
    }, [isNewChat, historicalMessages]);

    // Local session state — enables optimistic title/description updates after rename
    const [localSession, setLocalSession] = React.useState<ISession | undefined>(session);
    const [isRenameModalOpen, setIsRenameModalOpen] = React.useState<boolean>(false);

    // Model/effort/thinking selection state
    const [selectedModel, setSelectedModel] = React.useState<string>('sonnet');
    const [selectedEffort, setSelectedEffort] = React.useState<string>('medium');
    const [thinking, setThinking] = React.useState<boolean>(true);

    // Init model/effort from the last assistant message of the session (on mount for existing sessions)
    React.useEffect(() => {
        if (!historicalMessages || historicalMessages.length === 0) return;
        const lastAssistant: IMessage | undefined = [...historicalMessages].reverse().find(
            (m: IMessage) => m.role === EMessageRole.ASSISTANT && m.aiModel,
        );
        if (!lastAssistant?.aiModel) return;
        const modelId: string = lastAssistant.aiModel.toLowerCase();
        if (modelId.includes('haiku')) setSelectedModel('haiku');
        else if (modelId.includes('opus')) setSelectedModel('opus');
        else if (modelId.includes('sonnet')) setSelectedModel('sonnet');
        if (lastAssistant.effortLevel) setSelectedEffort(lastAssistant.effortLevel);
        if (typeof lastAssistant.thinking === 'boolean') setThinking(lastAssistant.thinking);
    }, []); // run once on mount — historicalMessages is stable at this point

    // Project directory state for new chats
    const [projectDir, setProjectDir] = React.useState<string>('');
    const [isBrowsing, setIsBrowsing] = React.useState<boolean>(false);
    const [isRefreshingMessages, setIsRefreshingMessages] = React.useState<boolean>(false);
    const [showScrollButton, setShowScrollButton] = React.useState<boolean>(false);

    // debug(`[ChatSessionView] Render — isNewChat: ${isNewChat}, sessionId: ${session?.sessionId ?? contextInfo?.sessionId ?? 'none'}, status: ${status}, liveMessages: ${messages.length}, streaming: ${streamingContent !== null}, historicalMessages: ${historicalMessages?.length ?? 0}`);

    // Update URL from /c/new → /c/{sessionId} as soon as system event provides the sessionId
    React.useEffect(() => {
        if (isNewChat && contextInfo?.sessionId && !hasUpdatedUrlRef.current) {
            hasUpdatedUrlRef.current = true;
            const newUrl: string = routes.sessionPath(contextInfo.sessionId);
            debug(`[ChatSessionView] Updating URL → ${newUrl}`);
            window.history.replaceState(null, '', newUrl);
        }
    }, [isNewChat, contextInfo?.sessionId]);

    // Refresh sidebar after first response completes (with delay for backend auto-sync)
    React.useEffect(() => {
        const hasAssistantMessage: boolean = messages.some((m: IChatMessage) => m.role === EMessageRole.ASSISTANT);
        if (isNewChat && hasAssistantMessage && status === EChatStatus.IDLE && !hasSyncedSidebarRef.current) {
            hasSyncedSidebarRef.current = true;
            debug('[ChatSessionView] First response complete — refreshing sidebar (2s delay for auto-sync)');
            const timeoutId: ReturnType<typeof setTimeout> = setTimeout(async (): Promise<void> => {
                await refreshSidebar();
                window.dispatchEvent(new CustomEvent('session-created'));
                debug('[ChatSessionView] Sidebar refreshed!');
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
        debug(`[ChatSessionView] edit_session complete — navigating to forked session ${forkedSessionId} (5s delay for sync)`);
        setTimeout((): void => {
            router.replace(routes.sessionPath(forkedSessionId));
        }, 5000);
    }, [forkedSessionId, status, router]);

    // True while Claude is actively responding — blocks new input and edit triggers
    const isChattingDisabled: boolean = status === EChatStatus.STREAMING
        || status === EChatStatus.TOOL_RUNNING
        || status === EChatStatus.CONNECTING
        || status === EChatStatus.OFFLINE;

    // Main ChatInput disabled while chatting, editing, OR history not yet ready
    const disabled: boolean = isChattingDisabled || editingId !== null || !isHistoryReady;

    const isLoading: boolean = status === EChatStatus.SENDING
        || status === EChatStatus.STREAMING
        || status === EChatStatus.TOOL_RUNNING;

    // Auto-scroll: detect whether user is at (or near) the bottom
    const SCROLL_THRESHOLD: number = 50;
    const scrollRafRef = React.useRef<number | null>(null);

    const handleScroll = React.useCallback((): void => {
        if (scrollRafRef.current !== null) return;
        scrollRafRef.current = requestAnimationFrame((): void => {
            scrollRafRef.current = null;
            const el: HTMLDivElement | null = scrollContainerRef.current;
            if (!el) return;
            const atBottom: boolean = el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD;
            isAtBottomRef.current = atBottom;
            setShowScrollButton(!atBottom);
        });
    }, []);

    // Cancel pending rAF on unmount
    React.useEffect(() => {
        return (): void => {
            if (scrollRafRef.current !== null) {
                cancelAnimationFrame(scrollRafRef.current);
            }
        };
    }, []);

    const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'smooth'): void => {
        const el: HTMLDivElement | null = scrollContainerRef.current;
        if (!el) return;
        el.scrollTo({top: el.scrollHeight, behavior});
    }, []);

    const handleScrollToBottomClick = React.useCallback((): void => {
        isAtBottomRef.current = true;
        setShowScrollButton(false);
        scrollToBottom('smooth');
    }, [scrollToBottom]);

    // Scroll to bottom on mount when historical messages are present (e.g. page refresh).
    // Double rAF: first frame lets the virtualizer render items, second frame lets
    // ResizeObserver measure actual heights — so scrollHeight is fully settled.
    const hasScrolledOnMountRef = React.useRef<boolean>(false);
    React.useEffect(() => {
        if (hasScrolledOnMountRef.current || !localHistoricalMessages.length) return;
        hasScrolledOnMountRef.current = true;
        requestAnimationFrame((): void => {
            requestAnimationFrame((): void => {
                scrollToBottom('auto');
            });
        });
    }, [localHistoricalMessages.length, scrollToBottom]);

    // Auto-scroll on content changes — gated by isAtBottomRef
    React.useEffect(() => {
        if (isAtBottomRef.current) {
            scrollToBottom();
        }
    }, [messages.length, streamingContent, pendingApproval, scrollToBottom]);

    const handleSend = React.useCallback((text: string, attachments?: IAttachment[]): void => {
        debug(`[ChatSessionView] handleSend — text:`, text.slice(0, 50), `attachments:`, attachments?.length ?? 0);
        isAtBottomRef.current = true;
        setShowScrollButton(false);
        scrollToBottom('instant');
        const modelOpts: { model?: string; effort?: string; thinking?: boolean } = {
            model: selectedModel || undefined,
            effort: selectedEffort || undefined,
            thinking,
        };
        // Prefer session prop sessionId; fall back to contextInfo sessionId (covers /c/new
        // where replaceState updated the URL but the prop never changed after pause)
        const resolvedSessionId: string | undefined = session?.sessionId ?? contextInfo?.sessionId;
        const attachmentOpts: { attachments?: IAttachment[] } = attachments?.length ? {attachments} : {};
        sendMessage(text, isNewChat && !resolvedSessionId
            ? {projectDir: projectDir || undefined, ...modelOpts, ...attachmentOpts}
            : {sessionId: resolvedSessionId, ...modelOpts, ...attachmentOpts},
        );
    }, [sendMessage, isNewChat, session?.sessionId, contextInfo?.sessionId, projectDir, selectedModel, selectedEffort, thinking, scrollToBottom]);

    const handleSwitchModel = React.useCallback((model: string): void => {
        setSelectedModel(model);
        // Only switch mid-conversation if a session is already active
        if (contextInfo?.sessionId) {
            switchModel(model, selectedEffort || undefined, thinking);
        }
    }, [contextInfo?.sessionId, selectedEffort, thinking, switchModel]);

    const handleThinkingChange = React.useCallback((newThinking: boolean): void => {
        setThinking(newThinking);
        // Re-spawn the process with updated --settings when a session is already active.
        // --settings is a CLI startup flag — it only applies on spawn, not mid-process.
        if (contextInfo?.sessionId) {
            switchModel(selectedModel, selectedEffort || undefined, newThinking);
        }
    }, [contextInfo?.sessionId, selectedModel, selectedEffort, switchModel]);

    // Stable callbacks for edit actions — prevents new closure per message in .map()
    const handleStartEdit = React.useCallback((uuid: string): void => {
        setEditingId(uuid);
    }, []);

    const handleCancelEdit = React.useCallback((): void => {
        setEditingId(null);
    }, []);

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
            clearMessages();
            clearError();
            setLocalHistoricalMessages(result.messages);
            setHistoricalCutoffIndex(null);
            debug(`[ChatSessionView] Messages refreshed — ${result.messages.length} messages loaded`);
        }
        setIsRefreshingMessages(false);
    }, [session?.sessionId, clearMessages, clearError]);

    // Refetch messages from MongoDB when backend sends sync_complete.
    // This ensures the human-typed user message (only in JSONL, not in stream output)
    // and backfilled parentUuid values are picked up after JSONL sync finishes.
    React.useEffect(() => {
        const onSyncComplete = (e: Event): void => {
            const detail = (e as CustomEvent).detail as { sessionId: string | null };
            if (detail.sessionId && detail.sessionId === session?.sessionId) {
                hasPostSyncRefetchedRef.current = true;
                debug(`[ChatSessionView] sync-complete received — refetching messages for ${detail.sessionId}`);
                handleRefreshMessages();
            }
        };
        window.addEventListener('sync-complete', onSyncComplete);
        return (): void => {
            window.removeEventListener('sync-complete', onSyncComplete);
        };
    }, [session?.sessionId, handleRefreshMessages]);

    // Fallback: if historical messages exist but the first message is NOT a user message,
    // the human-typed user message is missing (JSONL sync hasn't added it yet).
    // Refetch after 5s to pick it up. This works regardless of WebSocket state or
    // chat status — it's purely a data completeness check.
    React.useEffect(() => {
        if (localHistoricalMessages.length > 0 && !hasPostSyncRefetchedRef.current) {
            const firstMessage: IMessage = localHistoricalMessages[0];
            if (firstMessage.role !== EMessageRole.USER) {
                const timerId: ReturnType<typeof setTimeout> = setTimeout((): void => {
                    if (!hasPostSyncRefetchedRef.current) {
                        hasPostSyncRefetchedRef.current = true;
                        debug('[ChatSessionView] First message is not user — refetching (JSONL sync may have added it)');
                        handleRefreshMessages();
                    }
                }, 3000);
                return (): void => {
                    clearTimeout(timerId);
                };
            }
        }
    }, [localHistoricalMessages, handleRefreshMessages]);

    const handleStubbed = React.useCallback((messageId: string): void => {
        setLocalHistoricalMessages((prev: IMessage[]) => prev.map((message: IMessage) => {
            if (message.messageId !== messageId) return message;
            return {
                ...message,
                content: (message.content as ContentBlock[]).map((block: ContentBlock) => {
                    if (block.type === 'tool_result' && !(block as ToolResultBlock)._stubbed) {
                        const tokenCount: number = Math.round(normalizeToolResultContent((block as ToolResultBlock).content).length / 4);
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

    const handleSessionRenamed = React.useCallback((updatedSession: ISession): void => {
        setLocalSession(updatedSession);
        window.dispatchEvent(new CustomEvent('session-renamed', {detail: {session: updatedSession}}));
    }, []);

    // Memoize sliced historical messages to avoid creating a new array on every render
    const visibleHistoricalMessages: IMessage[] = React.useMemo(
        () => {
            const sliced: IMessage[] = localHistoricalMessages.slice(0, historicalCutoffIndex ?? undefined);
            // Filter out "Prompt is too long" assistant messages — shown as an error banner instead
            return sliced.filter((msg: IMessage) => {
                if (msg.role !== EMessageRole.ASSISTANT) return true;
                const text: string = extractMessageText(msg.content).toLowerCase();
                return !text.includes('prompt is too long');
            });
        },
        [localHistoricalMessages, historicalCutoffIndex],
    );

    const historicalVirtualizer = useVirtualizer({
        count: visibleHistoricalMessages.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => 120,
        getItemKey: (index: number) => visibleHistoricalMessages[index].uuid,
        overscan: 5,
        gap: 16, // matches gap-4 (1rem) between messages
    });

    // Detect if the last historical assistant message is a context limit error.
    // Claude CLI reports "Prompt is too long" as the full assistant message content.
    // Guard: if session-level usage data shows < 95% context consumed (e.g. after a model
    // switch enlarged the context window, or /compact freed tokens), the error is stale.
    const isHistoricalContextLimit: boolean = React.useMemo((): boolean => {
        if (!localHistoricalMessages.length) return false;
        const last: IMessage = localHistoricalMessages[localHistoricalMessages.length - 1];
        if (last.role !== EMessageRole.ASSISTANT) return false;
        const text: string = extractMessageText(last.content).toLowerCase();
        if (!text.includes('prompt is too long')) return false;
        // Usage ratio guard — stale "Prompt is too long" after model switch / compact
        const used: number | undefined = session?.contextTokensUsed;
        const window: number | undefined = session?.contextWindowSize;
        if (used !== undefined && window !== undefined && window > 0 && used / window < 0.95) return false;
        return true;
    }, [localHistoricalMessages, session?.contextTokensUsed, session?.contextWindowSize]);

    const hasNoMessages: boolean = !localHistoricalMessages.length && messages.length === 0 && !streamingContent;
    // Show bouncing dots when Claude is actively working and no text response is visible yet.
    // TOOL_RUNNING: always show dots — the LLM has finished its response and tools are executing
    // on the backend. The streaming content is static (text + tool_use blocks); dots provide
    // feedback that work is still happening behind the scenes.
    // STREAMING: dots only when no text content has appeared yet (only thinking/tool_use blocks).
    // Once text starts flowing, the text itself is the activity indicator.
    const hasStreamingText: boolean = streamingContent !== null && streamingContent.some((block: ContentBlock) => block.type === 'text' && (block as TextBlock).text.length > 0);
    const showThinking: boolean =
        ((status === EChatStatus.SENDING || status === EChatStatus.CONNECTING) && !streamingContent)
        || (status === EChatStatus.TOOL_RUNNING && messages.length > 0)
        || (status === EChatStatus.STREAMING && !hasStreamingText && messages.length > 0);
    const showEmptyState: boolean = isNewChat && hasNoMessages && status === EChatStatus.IDLE;

    // Derive token usage from the last historical assistant message as a fallback
    const historicalTokenUsage = React.useMemo((): { input: number; output: number } | null => {
        if (!localHistoricalMessages.length) return null;
        for (let i: number = localHistoricalMessages.length - 1; i >= 0; i--) {
            const msg: IMessage = localHistoricalMessages[i];
            if (msg.role === EMessageRole.ASSISTANT && msg.tokenUsage && msg.tokenUsage.input > 0) {
                return msg.tokenUsage;
            }
        }
        return null;
    }, [localHistoricalMessages]);

    // When contextInfo exists but tokens are still 0 (system event fired, no usage data yet),
    // hold the historical values until live token data arrives from the result event.
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

    /*debug('Context Info:', {
        historicalInput,
        contextTokensUsed: session?.contextTokensUsed,
        historicalTokenUsage,
        historicalOutput,
        inputTokens: contextInfo?.inputTokens,
        outputTokens: contextInfo?.outputTokens,
        contextWindow: contextInfo?.contextWindow,
        contextWindowSize: session?.contextWindowSize,
        hasContextData,
    });*/

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
            {localSession && (
                <div className={'flex px-6 py-3 items-center justify-between border-b border-border shrink-0'}>
                    <div className={'flex flex-col justify-center min-w-0'}>
                        <div className={'flex gap-2 items-end'}>
                            <h1 className={'text-sm font-semibold truncate text-primary cursor-pointer hover:underline'} onClick={() => setIsRenameModalOpen(true)} title={'Click to rename session'}>
                                {localSession.title}
                            </h1>
                            <p className={'text-xs text-primary/80 font-semibold'}>({localSession.rawProjectDir})</p>
                        </div>

                        {localSession.description && (
                            <p className={'text-xs text-text-muted truncate mt-0.5'}>{localSession.description}</p>
                        )}

                        <div className={'flex items-center gap-1 text-xs text-primary'}>
                            {localSession.aiModel && (
                                <span>{localSession.aiModel}</span>
                            )}
                            {(localSession.aiModel && localSession.gitBranch) && (
                                <span>•</span>
                            )}{localSession.gitBranch && (
                            <span>{localSession.gitBranch}</span>
                        )}
                        </div>
                    </div>

                    <div className={'flex items-center gap-2 shrink-0'}>
                        <Button variant={'ghost'} size={'icon'} onClick={handleRefreshMessages} disabled={isRefreshingMessages || isChattingDisabled} className={'size-7 text-text-muted'}
                                title={'Refresh session'}>
                            <HiOutlineRefresh className={cn('size-3.5', isRefreshingMessages && 'animate-spin')}/>
                        </Button>
                        <DeleteSessionButton sessionId={localSession.sessionId} sessionTitle={localSession.title}/>
                        <span
                            className={cn('size-2.5 rounded-full animate-pulse', status === EChatStatus.CONNECTING ? 'bg-warning' : status === EChatStatus.ERROR || status === EChatStatus.OFFLINE ? 'bg-error' : 'bg-success')}
                            title={status === EChatStatus.CONNECTING ? 'WebSocket reconnecting...' : status === EChatStatus.ERROR || status === EChatStatus.OFFLINE ? 'WebSocket disconnected' : 'WebSocket connected'}/>
                    </div>
                </div>
            )}

            {/* Rename Session Modal */}
            {localSession && (
                <RenameSessionModal isOpen={isRenameModalOpen} onOpenChange={setIsRenameModalOpen} session={localSession} onSaved={handleSessionRenamed}/>
            )}

            {/* Messages area */}
            <div className={'relative flex-1 min-h-0'}>
                <div ref={scrollContainerRef} onScroll={handleScroll} className={'h-full overflow-y-auto px-6 py-4'}>
                    {showEmptyState ? (
                        <div className={'h-full flex items-center justify-center'}>
                            <div className={'flex flex-col items-center gap-8 max-w-3xl w-full px-4'}>
                                {/* Decorative icon */}
                                <div className={'size-14 rounded-2xl bg-primary/10 flex items-center justify-center'}>
                                    <HiOutlineTerminal className={'size-7 text-primary'}/>
                                </div>

                                {/* Heading */}
                                <div className={'text-center space-y-1.5'}>
                                    <h2 className={'text-xl font-semibold text-text'}>What can I help you with?</h2>
                                    <p className={'text-sm text-text-muted'}>Chat with Claude about your code</p>
                                </div>

                                {/* Project directory input */}
                                <div className={'w-full'}>
                                    <label className={'block text-xs text-text-muted mb-1.5'}>Project directory (optional)</label>
                                    <div className={'flex items-center gap-2'}>
                                        <input
                                            type={'text'}
                                            value={projectDir}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProjectDir(e.target.value)}
                                            placeholder={'/Users/you/projects/my-app'}
                                            className={'flex-1 px-3 py-2 text-sm font-mono bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'}
                                        />
                                        <Button variant={'primary'} size={'sm'} onClick={handleBrowse} isLoading={isBrowsing} disabled={isBrowsing}>
                                            <HiOutlineFolder className={'size-4'}/>
                                            Browse...
                                        </Button>
                                    </div>
                                </div>

                                {/* How it works */}
                                <p className={'text-xs text-text-muted text-center leading-relaxed'}>
                                    Set a project directory, type a message, and Claude will work directly in your codebase
                                </p>

                                {/* Capability pills */}
                                <div className={'flex flex-wrap justify-center gap-2'}>
                                <span className={'inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1'}>
                                    <HiOutlineCode className={'size-3.5 text-primary'}/>
                                    <span className={'text-xs text-text-muted'}>Read and edit files</span>
                                </span>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1'}>
                                    <HiOutlineTerminal className={'size-3.5 text-primary'}/>
                                    <span className={'text-xs text-text-muted'}>Run commands</span>
                                </span>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1'}>
                                    <HiOutlineSearch className={'size-3.5 text-primary'}/>
                                    <span className={'text-xs text-text-muted'}>Search codebase</span>
                                </span>
                                    <span className={'inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1'}>
                                    <HiOutlineBeaker className={'size-3.5 text-primary'}/>
                                    <span className={'text-xs text-text-muted'}>Write tests</span>
                                </span>
                                </div>

                                {/* Keyboard shortcut hints */}
                                <div className={'flex flex-wrap justify-center gap-x-4 gap-y-1'}>
                                <span className={'text-[11px] text-text-muted'}>
                                    <kbd className={'px-2 py-1 rounded bg-primary/1 border border-primary/30 text-[10px] font-mono'}>Enter</kbd> to send
                                </span>
                                    <span className={'text-[11px] text-text-muted'}>
                                    <kbd className={'px-2 py-1 rounded bg-primary/1 border border-primary/30 text-[10px] font-mono'}>Shift + Enter</kbd> for new line
                                </span>
                                    <span className={'text-[11px] text-text-muted'}>
                                    Markdown supported
                                </span>
                                    <span className={'text-[11px] text-text-muted'}>
                                    Voice input available
                                </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={'max-w-3xl mx-auto flex flex-col gap-4'}>
                            {/* Historical messages — virtualized, sliced at edit cutoff when user edits from history */}
                            {visibleHistoricalMessages.length > 0 && (
                                <div style={{height: historicalVirtualizer.getTotalSize(), position: 'relative', width: '100%'}}>
                                    {historicalVirtualizer.getVirtualItems().map((virtualItem: VirtualItem) => {
                                        const message: IMessage = visibleHistoricalMessages[virtualItem.index];
                                        const index: number = virtualItem.index;

                                        const isUser: boolean = message.role === EMessageRole.USER;

                                        // Sub-agent prompt: a user message that follows an assistant message containing an Agent tool_use.
                                        // These are AI-generated delegation instructions, not human-typed messages.
                                        const prevMessage: IMessage | undefined = index > 0 ? visibleHistoricalMessages[index - 1] : undefined;
                                        const isSubAgentPrompt: boolean = isUser
                                            && prevMessage?.role === EMessageRole.ASSISTANT
                                            && Array.isArray(prevMessage.content)
                                            && prevMessage.content.some((block: ContentBlock) => block.type === 'tool_use' && (block as ToolUseBlock).name === 'Agent');

                                        return (
                                            <div key={virtualItem.key} data-index={virtualItem.index} ref={historicalVirtualizer.measureElement}
                                                 style={{position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItem.start}px)`}}>
                                                {editingId === message.uuid ? (
                                                    <div className={'flex flex-col items-end'}>
                                                        <InlineMessageEditor
                                                            initialText={extractMessageText(message.content)}
                                                            disabled={isChattingDisabled}
                                                            onSave={(newText: string) => handleHistoricalEditSave(newText, index)}
                                                            onCancel={handleCancelEdit}
                                                        />
                                                    </div>
                                                ) : (
                                                    <MessageBubble
                                                        message={message}
                                                        index={index}
                                                        sessionId={session?.sessionId}
                                                        isSubAgentPrompt={isSubAgentPrompt}
                                                        canEdit={isUser && !isChattingDisabled && editingId === null}
                                                        onEdit={handleStartEdit}
                                                        onRegenerate={!isUser && canRegenerate ? handleHistoricalRegenerate : undefined}
                                                        onStubbed={handleStubbed}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Live messages (user + finalized assistant) */}
                            {messages.filter((msg: IChatMessage) => {
                                if (msg.role !== EMessageRole.ASSISTANT) return true;
                                const text: string = extractMessageText(msg.content).toLowerCase();
                                return !text.includes('prompt is too long');
                            }).map((message: IChatMessage, index: number, filteredMessages: IChatMessage[]) => {
                                const isUser: boolean = message.role === EMessageRole.USER;

                                if (editingId === message.id) {
                                    return (
                                        <div key={message.id} className={'flex flex-col items-end'}>
                                            <InlineMessageEditor
                                                initialText={extractMessageText(message.content)}
                                                disabled={isChattingDisabled}
                                                onSave={(newText: string) => handleLiveEditSave(newText, index)}
                                                onCancel={handleCancelEdit}
                                            />
                                        </div>
                                    );
                                }

                                const isCommandOutput: boolean = isUser && typeof message.content === 'string' && message.content.includes('<local-command-stdout>');
                                const isToolResult: boolean = isUser && Array.isArray(message.content) && message.content.some((block: ContentBlock) => block.type === 'tool_result');
                                // Sub-agent prompt: user message following an assistant message with Agent tool_use
                                const prevLiveMessage: IChatMessage | undefined = index > 0 ? filteredMessages[index - 1] : undefined;
                                const isSubAgentPrompt: boolean = isUser
                                    && prevLiveMessage?.role === EMessageRole.ASSISTANT
                                    && Array.isArray(prevLiveMessage.content)
                                    && prevLiveMessage.content.some((block: ContentBlock) => block.type === 'tool_use' && (block as ToolUseBlock).name === 'Agent');
                                const isSystemUserMessage: boolean = isCommandOutput || isToolResult;
                                const isSyntheticMessage: boolean = !isUser && (message.model === '<synthetic>' || message.model === 'synthetic');
                                const copyText: string = extractMessageText(message.content);
                                const hasAttachments: boolean = !!(message.attachments && message.attachments.length > 0);
                                const hasNonTextBlock: boolean = hasAttachments || (Array.isArray(message.content) && message.content.some((block: ContentBlock) => block.type !== 'text'));
                                return (
                                    <BubbleShell
                                        key={message.id}
                                        isUser={isUser}
                                        isSystemUser={isSystemUserMessage}
                                        isSubAgentPrompt={isSubAgentPrompt}
                                        isSynthetic={isSyntheticMessage}
                                        hasNonTextBlock={hasNonTextBlock}
                                        metadata={
                                            <div className={'flex items-center gap-2 mt-1 px-1'}>
                                                {/*{(isUser && !isChattingDisabled && editingId === null) && (
                                                    <Button variant={'ghost'} size={'icon'} onClick={() => setEditingId(message.id)} title={'Edit message'}
                                                            className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'}>
                                                        <HiOutlinePencil className={'size-3.5'}/>
                                                    </Button>
                                                )}
                                                {(() => {
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
                                                {(!isUser && message.model && !isSyntheticMessage) && (
                                                    <span className={'text-xs text-text-muted italic'}>
                                                        Prepared using {formatModelName(message.model)}
                                                    </span>
                                                )}
                                                {isSyntheticMessage && (
                                                    <span className={'text-xs text-warning/70 italic'}>System notice</span>
                                                )}
                                            </div>
                                        }
                                    >
                                        {isSubAgentPrompt && (
                                            <div className={'flex items-center gap-1.5 pb-1'}>
                                                <HiOutlineChevronDoubleRight className={'size-3.5 text-primary/60'}/>
                                                <span className={'text-xs font-semibold text-primary/60'}>Sub-agent</span>
                                            </div>
                                        )}
                                        {/* Attachment thumbnails (user messages with files) */}
                                        {(message.attachments && message.attachments.length > 0) && (
                                            <div className={'flex flex-wrap gap-5'}>
                                                {message.attachments.map((attachment: IAttachment, attachIdx: number) => (
                                                    attachment.mimeType.startsWith('image/') ? (
                                                        <ImageThumbnail
                                                            key={attachIdx}
                                                            src={`data:${attachment.mimeType};base64,${attachment.data}`}
                                                            alt={attachment.name}
                                                            width={200}
                                                            height={200}
                                                            className={'rounded-lg max-w-48 max-h-48 object-contain'}
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div key={attachIdx} className={'flex items-center gap-2 rounded-lg bg-background/50 border border-border/50 px-3 py-2'}>
                                                            <span className={'text-xs font-medium text-text'}>{attachment.name}</span>
                                                        </div>
                                                    )
                                                ))}
                                            </div>
                                        )}
                                        <MessageContent content={message.content}/>
                                    </BubbleShell>
                                );
                            })}

                            {/* Streaming assistant response */}
                            {streamingContent && (
                                <BubbleShell isUser={false} hasNonTextBlock={streamingContent.some((block: ContentBlock) => block.type !== 'text')}>
                                    <MessageContent content={streamingContent}/>
                                </BubbleShell>
                            )}

                            {/* Tool approval prompt — shown inline when hook is waiting for user decision */}
                            {pendingApproval && (
                                <ToolApprovalPrompt approval={pendingApproval} onRespond={respondToApproval}/>
                            )}

                            {/* Thinking dots — waiting for first token */}
                            {showThinking && (
                                <div className={'flex items-start'}>
                                    <div className={'rounded-2xl px-4 py-3 bg-assistant-bubble flex items-center gap-1.5'}>
                                        <span className={'size-1.5 rounded-full bg-primary'} style={{animation: 'claude-dot 0.8s infinite', animationDelay: '0ms'}}/>
                                        <span className={'size-1.5 rounded-full bg-primary'} style={{animation: 'claude-dot 0.8s infinite', animationDelay: '120ms'}}/>
                                        <span className={'size-1.5 rounded-full bg-primary'} style={{animation: 'claude-dot 0.8s infinite', animationDelay: '240ms'}}/>
                                    </div>
                                </div>
                            )}

                            {/* Error state (live) — disabled until context tracking is redesigned
                            {status === EChatStatus.ERROR && error && (
                                <div className={'flex items-start gap-2 rounded-2xl px-4 py-3 bg-error/10 border border-error/20 text-error text-sm'}>
                                    <HiOutlineExclamationCircle className={'size-4 shrink-0 mt-0.5'}/>
                                    <span className={'flex-1'}>{error}</span>
                                </div>
                            )} */}

                            {/* Context limit banner (historical) — disabled until context tracking is redesigned
                            {isHistoricalContextLimit && status !== EChatStatus.ERROR && (
                                <div className={'flex items-start gap-2 rounded-2xl px-4 py-3 bg-error/10 border border-error/20 text-error text-sm'}>
                                    <HiOutlineExclamationCircle className={'size-4 shrink-0 mt-0.5'}/>
                                    <span className={'flex-1'}>Context limit reached. Start a new session, or run /compact or /clear in the terminal to continue!</span>
                                </div>
                            )} */}
                        </div>
                    )}
                </div>

                {/* Scroll to bottom button */}
                {showScrollButton && (
                    <Button variant={'ghost'} size={'icon'} onClick={handleScrollToBottomClick}
                            className={'absolute bottom-4 right-6 size-8 rounded-full bg-surface border border-border shadow-md text-text-muted hover:text-text'} title={'Scroll to bottom'}>
                        <FaArrowDown className={'size-4'}/>
                    </Button>
                )}
            </div>

            {/* Chat input */}
            <div className={'max-w-3xl mx-auto w-full gap-4'}>
                {/* ContextBar — disabled until context tracking is redesigned */}
                {/*{hasContextData && (
                    <ContextBar inputTokens={inputTokens} outputTokens={outputTokens} contextWindow={contextWindow}/>
                )}*/}
                <ChatInput
                    onSend={handleSend}
                    onStop={stopExecution}
                    disabled={disabled}
                    isLoading={isLoading}
                    selectedModel={selectedModel}
                    selectedEffort={selectedEffort}
                    thinking={thinking}
                    onModelChange={handleSwitchModel}
                    onEffortChange={setSelectedEffort}
                    onThinkingChange={handleThinkingChange}
                    ideStatus={ideStatus}
                />
            </div>
        </div>
    );
}

export {ChatSessionView};
