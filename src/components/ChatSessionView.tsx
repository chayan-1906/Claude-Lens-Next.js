"use client";

import React from "react";
import {useRouter} from "next/navigation";
import {FaArrowDown} from "react-icons/fa";
import {IoMdRefresh} from "react-icons/io";
import {
    HiOutlineArchive,
    HiOutlineBeaker,
    HiOutlineChevronDoubleRight,
    HiOutlineCode,
    HiOutlineExclamationCircle,
    HiOutlineFolder,
    HiOutlineRefresh,
    HiOutlineSearch,
    HiOutlineShieldCheck,
    HiOutlineTerminal,
    HiOutlineWifi,
} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {debug} from "@/utils/debug";
import {routes} from "@/utils/routes";
import {IProject} from "@/types/project";
import {Button} from "@/components/ui/Button";
import {ChatInput} from "@/components/ChatInput";
import {IUseTextToSpeechReturn} from "@/types/tts";
import {useClaudeChat} from "@/hooks/useClaudeChat";
import {BubbleShell} from "@/components/BubbleShell";
import {SearchModal} from "@/components/SearchModal";
import {IOpenFolderPickerResponse} from "@/types/file";
import {formatModelName} from "@/utils/formatModelName";
import {openFolderPicker} from "@/actions/file.actions";
import {useTextToSpeech} from "@/hooks/useTextToSpeech";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {MessageBubble} from "@/components/MessageBubble";
import {parseUserMessage} from "@/utils/parseUserMessage";
import {ImageThumbnail} from "@/components/ImageThumbnail";
import {MessageContent} from "@/components/MessageContent";
import {MCPServersPanel} from "@/components/MCPServersPanel";
import {ReadAloudButton} from "@/components/ReadAloudButton";
import {SESSION_MESSAGES_PAGE_SIZE} from "@/utils/pagination";
import {CopyMessageButton} from "@/components/CopyMessageButton";
import {ToolApprovalPrompt} from "@/components/ToolApprovalPrompt";
import {RenameSessionModal} from "@/components/RenameSessionModal";
import {DeleteSessionButton} from "@/components/DeleteSessionButton";
import {getSession, refreshSidebar} from "@/actions/session.actions";
import {InlineMessageEditor} from "@/components/InlineMessageEditor";
import {computeProjectDisplayNames} from "@/utils/projectDisplayName";
import {VoiceSettingsPopover} from "@/components/VoiceSettingsPopover";
import {DownloadSessionPdfButton} from "@/components/DownloadSessionPdfButton";
import {IGetSessionPagination, IGetSessionResponse, ISession} from "@/types/session";
import {EChatStatus, IAttachment, IChatMessage, IPendingToolApproval} from "@/types/chat";
import {ICapabilityRow, IChatSessionViewProps, IProjectChipColor} from "@/types/components";
import {extractMessageText, extractSpeakableText, normalizeToolResultContent} from "@/utils/extractMessageText";
import {ContentBlock, EMessageRole, EUserMessageType, IMessage, TextBlock, ThinkingBlock, ToolResultBlock, ToolUseBlock} from "@/types/message";

const SCROLL_THRESHOLD: number = 50;
const LOAD_MORE_THRESHOLD: number = 120;

const PROJECT_CHIP_COLORS: IProjectChipColor[] = [
    {
        base: 'bg-primary/10 border-primary/25 text-primary/80',
        hover: 'hover:bg-primary/15 hover:border-primary/40',
        active: 'bg-primary/20 border-primary/60 text-primary ring-2 ring-primary/20',
        dot: 'bg-primary',
    },
    {
        base: 'bg-success/10 border-success/25 text-success/80',
        hover: 'hover:bg-success/15 hover:border-success/40',
        active: 'bg-success/20 border-success/60 text-success ring-2 ring-success/20',
        dot: 'bg-success',
    },
    {
        base: 'bg-warning/10 border-warning/25 text-warning/80',
        hover: 'hover:bg-warning/15 hover:border-warning/40',
        active: 'bg-warning/20 border-warning/60 text-warning ring-2 ring-warning/20',
        dot: 'bg-warning',
    },
    {base: 'bg-error/10 border-error/25 text-error/80', hover: 'hover:bg-error/15 hover:border-error/40', active: 'bg-error/20 border-error/60 text-error ring-2 ring-error/20', dot: 'bg-error'},
    {
        base: 'bg-accent/10 border-accent/25 text-accent/80',
        hover: 'hover:bg-accent/15 hover:border-accent/40',
        active: 'bg-accent/20 border-accent/60 text-accent ring-2 ring-accent/20',
        dot: 'bg-accent',
    },
];

const CAPABILITY_ROWS: ICapabilityRow[] = [
    {icon: <HiOutlineCode className={'size-3.5'}/>, color: 'text-primary', bg: 'bg-primary/8', label: 'Read and edit files', desc: 'Browse, create, modify source files in your project'},
    {icon: <HiOutlineTerminal className={'size-3.5'}/>, color: 'text-success', bg: 'bg-success/8', label: 'Run commands', desc: 'Execute shell commands, npm scripts, builds'},
    {icon: <HiOutlineSearch className={'size-3.5'}/>, color: 'text-warning', bg: 'bg-warning/8', label: 'Search codebase', desc: 'Grep, find, and analyse across your entire repo'},
    {icon: <HiOutlineBeaker className={'size-3.5'}/>, color: 'text-accent', bg: 'bg-accent/8', label: 'Write tests', desc: 'Generate unit, integration, and e2e test suites'},
];

function ChatSessionView({isNewChat, session, historicalMessages, initialPagination, r2Configured, groqConfigured, localJsonlAvailable, projects}: IChatSessionViewProps) {
    const router = useRouter();
    const {
        status, messages, streamingContent, contextInfo, ideStatus, error, retryable, forkedSessionId, pendingApproval,
        sendMessage, editMessage, regenerateMessage, respondToApproval, switchModel, backupSession, stopExecution, retry, clearMessages, pruneSyncedMessages, clearError,
    } = useClaudeChat();
    const tts: IUseTextToSpeechReturn = useTextToSpeech();

    /** Sentinel messageId used while stream-reading a live response. */
    const STREAM_READ_ID: string = '__streaming__';
    /** Tracks previous streamingContent presence to detect the end-of-stream transition. */
    const prevIsStreamingRef = React.useRef<boolean>(false);

    // --- Stream-read effects ---

    /** Feed new text to TTS as the streaming response grows. */
    React.useEffect(() => {
        if (!streamingContent || tts.activeMessageId !== STREAM_READ_ID) return;
        const fullText: string = extractSpeakableText(streamingContent);
        if (fullText) tts.pushStreamText(fullText);
    }, [streamingContent, tts]);

    /** Flush remaining buffer when the streaming response ends. */
    React.useEffect(() => {
        const isCurrentlyStreaming: boolean = streamingContent !== null;
        if (prevIsStreamingRef.current && !isCurrentlyStreaming && tts.activeMessageId === STREAM_READ_ID) {
            tts.endStreamRead();
        }
        prevIsStreamingRef.current = isCurrentlyStreaming;
    }, [streamingContent, tts]);

    // Refs to ensure post-first-response actions run only once
    const hasUpdatedUrlRef = React.useRef<boolean>(false);
    const hasSyncedSidebarRef = React.useRef<boolean>(false);   // true once sidebar refresh is triggered
    const sidebarFallbackScheduledRef = React.useRef<boolean>(false);  // true once the 5s fallback timeout is scheduled
    const hasPostSyncRefetchedRef = React.useRef<boolean>(false);
    // Tracks contextInfo.sessionId without triggering re-registration of the sync-complete listener
    const contextSessionIdForSyncRef = React.useRef<string | null>(null);

    // Live mirrors of status / pendingApproval — used inside async refresh logic so the
    // re-check after `await getSession()` reads the CURRENT value, not the captured one.
    const statusRef = React.useRef<EChatStatus>(status);
    const pendingApprovalRef = React.useRef<IPendingToolApproval | null>(pendingApproval);
    // Marks that a sync_complete arrived during a busy state. The drain effect below picks it up.
    const pendingRefetchRef = React.useRef<boolean>(false);

    // Auto-scroll refs
    const scrollContainerRef = React.useRef<HTMLDivElement | null>(null);
    const isAtBottomRef = React.useRef<boolean>(true);

    // Pinned tool-approval card — measured to pad the scroll area so all chat history stays scrollable behind it
    const approvalRef = React.useRef<HTMLDivElement | null>(null);
    const [approvalHeight, setApprovalHeight] = React.useState<number>(0);

    // Local copy of historical messages — enables optimistic stub updates without a full page refresh
    const [localHistoricalMessages, setLocalHistoricalMessages] = React.useState<IMessage[]>(historicalMessages ?? []);
    const [messagePagination, setMessagePagination] = React.useState<IGetSessionPagination | undefined>(initialPagination);
    const [isLoadingOlderMessages, setIsLoadingOlderMessages] = React.useState<boolean>(false);

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

    React.useEffect(() => {
        if (isNewChat) return;
        setLocalHistoricalMessages(historicalMessages ?? []);
        setMessagePagination(initialPagination);
        setHistoricalCutoffIndex(null);
    }, [isNewChat, historicalMessages, initialPagination]);

    // Local session state — enables optimistic title/description updates after rename
    const [localSession, setLocalSession] = React.useState<ISession | undefined>(session);
    const [isRenameModalOpen, setIsRenameModalOpen] = React.useState<boolean>(false);
    const [isSearchOpen, setIsSearchOpen] = React.useState<boolean>(false);

    // Dynamic browser tab title
    const isLive: boolean = status === EChatStatus.STREAMING || status === EChatStatus.SENDING || status === EChatStatus.TOOL_RUNNING;
    const sessionTitle: string = isNewChat ? 'New Chat' : (localSession?.title ?? 'Session');
    const documentTitle: string = isLive ? `(live) ${sessionTitle}` : sessionTitle;
    useDocumentTitle(documentTitle, pendingApproval !== null);

    // Model/effort/thinking selection state
    const [selectedModel, setSelectedModel] = React.useState<string>('sonnet');
    const [selectedEffort, setSelectedEffort] = React.useState<string>('medium');
    const [thinking, setThinking] = React.useState<boolean>(true);

    // Init model/effort from the last assistant message of the session (on mount for existing sessions)
    React.useEffect(() => {
        if (!historicalMessages || historicalMessages.length === 0) return;
        const lastAssistant: IMessage | undefined = [...historicalMessages].reverse().find(
            (message: IMessage) => message.role === EMessageRole.ASSISTANT && message.aiModel,
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

    // Sorted projects + display names for the new-chat project chips
    const {sortedProjects, projectDisplayNames} = React.useMemo(() => {
        const valid: IProject[] = (projects ?? []).filter((p: IProject) => p.rawProjectDir.trim() !== '');
        const names: Map<string, string> = computeProjectDisplayNames(valid);
        const sorted: IProject[] = [...valid].sort((projectA: IProject, projectB: IProject) =>
            (names.get(projectA.rawProjectDir) ?? '').toLowerCase().localeCompare((names.get(projectB.rawProjectDir) ?? '').toLowerCase()),
        );
        return {sortedProjects: sorted, projectDisplayNames: names};
    }, [projects]);

    // Allowed directories state for new chats
    const [allowedDirs, setAllowedDirs] = React.useState<string[]>([]);
    const [allowedDirInput, setAllowedDirInput] = React.useState<string>('');
    const [isBrowsingAllowedDir, setIsBrowsingAllowedDir] = React.useState<boolean>(false);
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

    React.useEffect(() => {
        setLocalSession(session);
    }, [session]);

    React.useEffect(() => {
        if (!isLive) {
            return;
        }

        const confirmMessage: string = 'Claude is still responding. Leave this session?';

        const handleBeforeUnload = (beforeUnloadEvent: BeforeUnloadEvent): void => {
            beforeUnloadEvent.preventDefault();
        }

        // Intercept Next.js <Link> clicks (and any in-app <a> click). Capture phase runs
        // before Next.js routing, so preventDefault here cancels client-side navigation.
        const handleAnchorClickCapture = (mouseEvent: MouseEvent): void => {
            if (mouseEvent.defaultPrevented || mouseEvent.button !== 0) {
                return;
            }
            if (mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.shiftKey || mouseEvent.altKey) {
                return;
            }
            const anchor: HTMLAnchorElement | null = (mouseEvent.target as HTMLElement | null)?.closest('a') ?? null;
            if (!anchor) {
                return;
            }
            const href: string | null = anchor.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                return;
            }
            if (anchor.target && anchor.target !== '' && anchor.target !== '_self') {
                return;
            }
            if (anchor.hasAttribute('download')) {
                return;
            }
            // External link → let beforeunload handle it
            try {
                const url: URL = new URL(href, window.location.href);
                if (url.origin !== window.location.origin) {
                    return;
                }
                if (url.pathname === window.location.pathname && url.search === window.location.search) {
                    return;
                }
            } catch {
                return;
            }
            if (!window.confirm(confirmMessage)) {
                mouseEvent.preventDefault();
                mouseEvent.stopPropagation();
            }
        }

        // Intercept browser back/forward. popstate fires AFTER the navigation, so on cancel
        // we push the original URL back to undo it.
        const guardedHref: string = window.location.href;
        const handlePopState = (): void => {
            if (!window.confirm(confirmMessage)) {
                window.history.pushState(null, '', guardedHref);
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('click', handleAnchorClickCapture, true);
        window.addEventListener('popstate', handlePopState);
        return (): void => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('click', handleAnchorClickCapture, true);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isLive]);

    // Keep contextInfo.sessionId in a ref so the sync-complete listener doesn't re-register on every token update
    React.useEffect(() => {
        contextSessionIdForSyncRef.current = contextInfo?.sessionId ?? null;
    }, [contextInfo?.sessionId]);

    // Primary: refresh sidebar when backend signals JSONL sync is done — rawProjectDir is populated by then
    React.useEffect(() => {
        if (!isNewChat) return;
        const handler = async (e: Event): Promise<void> => {
            const detail = (e as CustomEvent<{ sessionId: string | null }>).detail;
            if (!detail.sessionId || detail.sessionId !== contextSessionIdForSyncRef.current) return;
            if (hasSyncedSidebarRef.current) return;
            hasSyncedSidebarRef.current = true;
            debug('[ChatSessionView] sync-complete → refreshing sidebar for new session');
            await refreshSidebar();
            router.refresh();
            window.dispatchEvent(new CustomEvent('session-created'));
        }
        window.addEventListener('sync-complete', handler);
        return (): void => {
            window.removeEventListener('sync-complete', handler);
        };
    }, [isNewChat, router]);

    // Fallback: if sync-complete doesn't arrive, refresh sidebar 5s after the first IDLE turn
    React.useEffect(() => {
        const hasAssistantMessage: boolean = messages.some((m: IChatMessage) => m.role === EMessageRole.ASSISTANT);
        if (!isNewChat || !hasAssistantMessage || status !== EChatStatus.IDLE || sidebarFallbackScheduledRef.current) return;
        sidebarFallbackScheduledRef.current = true;
        debug('[ChatSessionView] First response complete — scheduling 5s fallback sidebar refresh');
        const timeoutId: ReturnType<typeof setTimeout> = setTimeout(async (): Promise<void> => {
            if (hasSyncedSidebarRef.current) return;  // sync-complete already handled it
            hasSyncedSidebarRef.current = true;
            debug('[ChatSessionView] 5s fallback — refreshing sidebar');
            await refreshSidebar();
            router.refresh();
            window.dispatchEvent(new CustomEvent('session-created'));
        }, 5000);
        return (): void => {
            clearTimeout(timeoutId);
        };
    }, [isNewChat, messages, status, router]);

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
    const scrollRafRef = React.useRef<number | null>(null);
    const isLoadingOlderMessagesRef = React.useRef<boolean>(false);

    React.useEffect(() => {
        isLoadingOlderMessagesRef.current = isLoadingOlderMessages;
    }, [isLoadingOlderMessages]);

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

    const loadOlderMessages = React.useCallback(async (): Promise<void> => {
        const sessionId: string | undefined = session?.sessionId;
        const nextCursor: string | null | undefined = messagePagination?.nextCursor;
        const hasMore: boolean = messagePagination?.hasMore ?? false;

        if (!sessionId || !hasMore || !nextCursor || isLoadingOlderMessagesRef.current) {
            return;
        }

        const container: HTMLDivElement | null = scrollContainerRef.current;
        const previousScrollHeight: number = container?.scrollHeight ?? 0;
        const previousScrollTop: number = container?.scrollTop ?? 0;

        isLoadingOlderMessagesRef.current = true;
        setIsLoadingOlderMessages(true);

        const result: IGetSessionResponse = await getSession({
            sessionId,
            limit: messagePagination?.limit ?? SESSION_MESSAGES_PAGE_SIZE,
            cursor: nextCursor,
        });

        if (result.success && result.messages && result.pagination) {
            setLocalHistoricalMessages((previousMessages: IMessage[]) => {
                const existingIds: Set<string> = new Set(previousMessages.map((message: IMessage) => message.messageId));
                const olderMessages: IMessage[] = result.messages!.filter((message: IMessage) => !existingIds.has(message.messageId));
                return [...olderMessages, ...previousMessages];
            });
            setMessagePagination(result.pagination);

            requestAnimationFrame((): void => {
                const currentContainer: HTMLDivElement | null = scrollContainerRef.current;
                if (!currentContainer) return;
                const heightDelta: number = currentContainer.scrollHeight - previousScrollHeight;
                currentContainer.scrollTop = previousScrollTop + heightDelta;
            });
        }

        isLoadingOlderMessagesRef.current = false;
        setIsLoadingOlderMessages(false);
    }, [session?.sessionId, messagePagination]);

    const handleScroll = React.useCallback((): void => {
        if (scrollRafRef.current !== null) return;
        scrollRafRef.current = requestAnimationFrame((): void => {
            scrollRafRef.current = null;
            const el: HTMLDivElement | null = scrollContainerRef.current;
            if (!el) return;
            const atBottom: boolean = el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD;
            isAtBottomRef.current = atBottom;
            setShowScrollButton(!atBottom);

            if (el.scrollTop <= LOAD_MORE_THRESHOLD) {
                void loadOlderMessages();
            }
        });
    }, [loadOlderMessages]);

    const handleScrollToBottomClick = React.useCallback((): void => {
        isAtBottomRef.current = true;
        setShowScrollButton(false);
        scrollToBottom('smooth');
    }, [scrollToBottom]);

    const handleApprovalResponse = React.useCallback((requestId: string, decision: 'allow' | 'deny', reason?: string, allowAll?: boolean): void => {
        isAtBottomRef.current = true;
        setShowScrollButton(false);
        respondToApproval(requestId, decision, reason, allowAll);
    }, [respondToApproval]);

    // Scroll to bottom on mount when historical messages are present (e.g. page refresh).
    // Double rAF: first frame lets the DOM paint, second frame lets
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
        const allowedDirsOpt: { allowedDirs?: string[] } = allowedDirs.length ? {allowedDirs} : {};
        sendMessage(text, isNewChat && !resolvedSessionId
            ? {projectDir: projectDir || undefined, ...modelOpts, ...attachmentOpts, ...allowedDirsOpt}
            : {sessionId: resolvedSessionId, ...modelOpts, ...attachmentOpts, ...allowedDirsOpt},
        );
    }, [sendMessage, isNewChat, session?.sessionId, contextInfo?.sessionId, projectDir, allowedDirs, selectedModel, selectedEffort, thinking, scrollToBottom]);

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

    const handleBrowseAllowedDir = React.useCallback(async (): Promise<void> => {
        setIsBrowsingAllowedDir(true);
        const result: IOpenFolderPickerResponse = await openFolderPicker();
        setIsBrowsingAllowedDir(false);
        if (result.success && result.path) {
            setAllowedDirInput(result.path);
        }
    }, []);

    const handleAddAllowedDir = React.useCallback((): void => {
        const trimmed: string = allowedDirInput.trim();
        if (!trimmed || allowedDirs.includes(trimmed)) return;
        setAllowedDirs((prev: string[]) => [...prev, trimmed]);
        setAllowedDirInput('');
    }, [allowedDirInput, allowedDirs]);

    const handleRemoveAllowedDir = React.useCallback((directory: string): void => {
        setAllowedDirs((prev: string[]) => prev.filter((dir: string) => dir !== directory));
    }, []);

    // Keep refs in sync so async paths inside handleRefreshMessages see CURRENT values
    // after their `await`, not stale closure-captured ones.
    React.useEffect(() => {
        statusRef.current = status;
    }, [status]);

    React.useEffect(() => {
        pendingApprovalRef.current = pendingApproval;
    }, [pendingApproval]);

    /** Measure the pinned approval card so the scroll area can reserve equivalent bottom-padding — keeps the most recent message reachable via manual scroll while the card floats above. */
    React.useEffect((): (() => void) | void => {
        if (!pendingApproval) {
            setApprovalHeight(0);
            return;
        }
        const el: HTMLDivElement | null = approvalRef.current;
        if (!el) return;
        setApprovalHeight(el.getBoundingClientRect().height);
        const observer: ResizeObserver = new ResizeObserver((): void => {
            setApprovalHeight(el.getBoundingClientRect().height);
        });
        observer.observe(el);
        return (): void => {
            observer.disconnect();
        };
    }, [pendingApproval]);

    /** True iff a chat turn is actively in flight — refreshing now would race unsynced live state. */
    const isConversationActive = React.useCallback((): boolean => {
        const s: EChatStatus = statusRef.current;
        return s === EChatStatus.SENDING
            || s === EChatStatus.STREAMING
            || s === EChatStatus.TOOL_RUNNING
            || pendingApprovalRef.current !== null;
    }, []);

    const handleRefreshMessages = React.useCallback(async (): Promise<void> => {
        const sessionId: string | undefined = session?.sessionId;
        if (!sessionId) {
            return;
        }
        // Defer if a turn is in flight — the MongoDB read won't yet reflect the live messages,
        // and replacing local state with the stale read would make them disappear from the UI.
        if (isConversationActive()) {
            pendingRefetchRef.current = true;
            debug(`[ChatSessionView] Refresh deferred — conversation active (status: ${statusRef.current})`);
            return;
        }
        pendingRefetchRef.current = false;

        setIsRefreshingMessages(true);
        const result: IGetSessionResponse = await getSession({
            sessionId,
            limit: Math.max(localHistoricalMessages.length, SESSION_MESSAGES_PAGE_SIZE),
        });
        // Re-check after the network round-trip: if a new turn started while we were waiting,
        // the result is now stale. Re-defer; the drain effect will pick it up.
        if (isConversationActive()) {
            pendingRefetchRef.current = true;
            setIsRefreshingMessages(false);
            debug('[ChatSessionView] Refresh aborted post-fetch — conversation became active during await');
            return;
        }
        if (result.success && result.messages && result.pagination) {
            const persisted: IMessage[] = result.messages;
            // Watermark = newest persisted timestamp. Live messages without a uuid (typically
            // user prompts and tool_results) are dropped iff their timestamp <= watermark.
            // Live messages with a uuid (assistant messages after stream completes) are dropped
            // iff their uuid is in the persisted set. Anything else stays in live (in flight).
            const persistedUuids: Set<string> = new Set<string>(persisted.map(({uuid}: IMessage) => uuid).filter((uuid: string | undefined): uuid is string => Boolean(uuid)));
            const lastPersisted: IMessage | undefined = persisted[persisted.length - 1];
            const watermarkMs: number = lastPersisted ? new Date(lastPersisted.timestamp).getTime() : 0;

            pruneSyncedMessages(persistedUuids, watermarkMs);
            clearError();
            setLocalHistoricalMessages(persisted);
            setMessagePagination(result.pagination);
            setHistoricalCutoffIndex(null);
            debug(`[ChatSessionView] Messages refreshed — ${persisted.length} historical, watermark: ${watermarkMs ? new Date(watermarkMs).toISOString() : 'none'}`);
        }
        setIsRefreshingMessages(false);
    }, [session?.sessionId, localHistoricalMessages.length, pruneSyncedMessages, clearError, isConversationActive]);

    // Drain: when the conversation becomes idle and a deferred refresh is pending, run it.
    React.useEffect(() => {
        if (!pendingRefetchRef.current) {
            return;
        }
        if (status !== EChatStatus.IDLE || pendingApproval !== null) {
            return;
        }
        debug('[ChatSessionView] Conversation idle — running deferred refresh');
        handleRefreshMessages();
    }, [status, pendingApproval, handleRefreshMessages]);

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
        return !(used !== undefined && window !== undefined && window > 0 && used / window < 0.95);
    }, [localHistoricalMessages, session?.contextTokensUsed, session?.contextWindowSize]);

    const toolUseMap = React.useMemo((): Map<string, ToolUseBlock> => {
        const map = new Map<string, ToolUseBlock>();
        for (const msg of localHistoricalMessages) {
            if (!Array.isArray(msg.content)) continue;
            for (const block of msg.content) {
                if (block.type === 'tool_use') {
                    map.set((block as ToolUseBlock).id, block as ToolUseBlock);
                }
            }
        }
        for (const msg of messages) {
            if (!Array.isArray(msg.content)) {
                continue;
            }
            for (const block of msg.content) {
                if (block.type === 'tool_use') {
                    map.set((block as ToolUseBlock).id, block as ToolUseBlock);
                }
            }
        }
        return map;
    }, [localHistoricalMessages, messages]);

    const toolResultMap = React.useMemo((): Map<string, ToolResultBlock> => {
        const map = new Map<string, ToolResultBlock>();
        for (const msg of localHistoricalMessages) {
            if (!Array.isArray(msg.content)) continue;
            for (const block of msg.content) {
                if (block.type === 'tool_result') {
                    map.set((block as ToolResultBlock).tool_use_id, block as ToolResultBlock);
                }
            }
        }
        for (const msg of messages) {
            if (!Array.isArray(msg.content)) {
                continue;
            }
            for (const block of msg.content) {
                if (block.type === 'tool_result') {
                    map.set((block as ToolResultBlock).tool_use_id, block as ToolResultBlock);
                }
            }
        }
        return map;
    }, [localHistoricalMessages, messages]);

    const pendingApprovalToolUseId: string | undefined = pendingApproval?.toolUseId;

    const userMessageHistory: string[] = React.useMemo((): string[] => {
        // Exclude tool_result messages (tool approval responses sent under the user role)
        const isTypedByUser = (content: string | ContentBlock[]): boolean => {
            if (typeof content === 'string') {
                const {type} = parseUserMessage(content);
                return type === EUserMessageType.PLAIN || type === EUserMessageType.SLASH_COMMAND;
            }
            return !content.some(({type}: ContentBlock) => type === 'tool_result');
        };
        const historicalUserTexts: string[] = localHistoricalMessages
            .filter(({role, content}: IMessage) => role === EMessageRole.USER && isTypedByUser(content))
            .map(({content}: IMessage) => extractMessageText(content))
            .filter(Boolean);
        const liveUserTexts: string[] = messages
            .filter(({role, content}: IChatMessage) => role === EMessageRole.USER && isTypedByUser(content))
            .map(({content}: IChatMessage) => extractMessageText(content))
            .filter(Boolean);
        return [...historicalUserTexts, ...liveUserTexts];
    }, [localHistoricalMessages, messages]);

    // True when context limit is hit — combines live (is_error result) and historical ("Prompt is too long") signals
    const isContextLimitReached: boolean = isHistoricalContextLimit || (status === EChatStatus.ERROR && !!error && error.includes('Context limit'));

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
                <div className={'flex items-center justify-between px-3 sm:px-6 py-3 border-b border-border bg-linear-to-r from-primary/6 to-surface shrink-0'}>
                    <div className={'flex flex-col justify-center min-w-0 gap-1'}>
                        <h1 className={'text-sm font-semibold truncate text-text cursor-pointer hover:text-primary transition-colors leading-tight'} onClick={() => setIsRenameModalOpen(true)}
                            title={'Click to rename session'}>
                            {localSession.title}
                        </h1>

                        {localSession.description && (
                            <p className={'text-xs text-text-muted truncate leading-tight'}>{localSession.description}</p>
                        )}

                        {(localSession.aiModel || localSession.gitBranch) && (
                            <div className={'flex items-center gap-1.5 flex-wrap'}>
                                {localSession.aiModel && (
                                    <span className={'inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/8 text-[10px] font-medium text-primary/70 leading-none'}>
                                        {localSession.aiModel}
                                    </span>
                                )}
                                {localSession.gitBranch && (
                                    <span className={'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-success/10 text-[10px] font-medium text-success/80 leading-none'}>
                                        <HiOutlineCode className={'size-2.5 shrink-0'}/>
                                        {localSession.gitBranch}
                                    </span>
                                )}
                            </div>
                        )}

                        <p className={'text-[10px] font-mono text-text-muted/50 truncate leading-tight'}>{localSession.rawProjectDir}</p>
                    </div>

                    <div className={'flex items-center gap-1 sm:gap-2 shrink-0'}>
                        <Button variant={'ghost'} size={'icon'} onClick={() => handleSend('/compact')} disabled={isChattingDisabled} className={'hidden sm:flex size-7 text-text-muted'}
                                title={'Compact session — summarise conversation history to free up context'}>
                            <HiOutlineArchive className={'size-3.5'}/>
                        </Button>
                        <Button variant={'ghost'} size={'icon'} onClick={handleRefreshMessages} disabled={isRefreshingMessages || isChattingDisabled} className={'size-7 text-text-muted'}
                                title={'Refresh session'}>
                            <HiOutlineRefresh className={cn('size-3.5', isRefreshingMessages && 'animate-spin')}/>
                        </Button>
                        {r2Configured && localJsonlAvailable && (
                            <Button variant={'ghost'} size={'icon'} onClick={() => backupSession(localSession.sessionId)} className={'hidden sm:flex size-7 text-text-muted'}
                                    title={'Backup session JSONL to R2'}>
                                <HiOutlineShieldCheck className={'size-3.5'}/>
                            </Button>
                        )}
                        <Button variant={'ghost'} size={'icon'} onClick={() => setIsSearchOpen(true)} className={'size-7 text-text-muted'} title={'Search in session'}>
                            <HiOutlineSearch className={'size-3.5'}/>
                        </Button>
                        <DownloadSessionPdfButton sessionId={localSession.sessionId}/>
                        <DeleteSessionButton sessionId={localSession.sessionId} sessionTitle={localSession.title} r2Configured={r2Configured}/>
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

            {/* Session search modal */}
            {localSession && (
                <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} defaultScope={'session'} sessionId={localSession.sessionId} projectDir={localSession.projectDir}/>
            )}

            {/* Messages area + MCP panel */}
            <div className={'flex flex-row flex-1 min-h-0'}>
                <div className={'relative flex-1 min-h-0 min-w-0'}>
                    <div ref={scrollContainerRef} onScroll={handleScroll} className={'h-full overflow-y-auto'}
                         style={approvalHeight > 0 ? {paddingBottom: approvalHeight + 12} : undefined}>
                        <div className={'max-w-4xl lg:max-w-6xl mx-auto px-6 py-4 min-h-full flex flex-col'}>
                            {showEmptyState ? (
                                <div className={'flex-1 flex items-center justify-center'}>
                                    <div className={'flex flex-col items-center gap-6 max-w-4xl w-full px-4'}>

                                        {/* Decorative icon */}
                                        <div className={'size-14 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm'}>
                                            <HiOutlineTerminal className={'size-7 text-primary'}/>
                                        </div>

                                        {/* H1 — page heading */}
                                        <div className={'text-center space-y-1.5'}>
                                            <h2 className={'text-xl font-semibold text-text'}>What can I help you with?</h2>
                                            <p className={'text-sm text-text-muted'}>Chat with Claude about your code</p>
                                        </div>

                                        {/* Notion callout block */}
                                        <div className={'w-full flex items-start gap-2.5 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15'}>
                                            <span className={'text-base select-none mt-px'}>💡</span>
                                            <p className={'text-xs text-text-muted leading-relaxed'}>
                                                Select a project chip below to set the working directory, or type a custom path and click <strong
                                                className={'font-semibold text-text'}>Browse...</strong>
                                            </p>
                                        </div>

                                        {/* Notion divider + H3: Recent Projects */}
                                        {sortedProjects.length > 0 && (
                                            <div className={'w-full'}>
                                                <div className={'flex items-center gap-3 mb-4'}>
                                                    <div className={'flex-1 h-px bg-border'}/>
                                                    <span className={'text-[11px] font-semibold text-text-muted uppercase tracking-widest flex items-center gap-1.5 shrink-0'}>
                                                        <HiOutlineFolder className={'size-3.5'}/>
                                                        Recent Projects
                                                    </span>
                                                    <div className={'flex-1 h-px bg-border'}/>
                                                </div>

                                                {/* Project chips — single-select */}
                                                <div className={'flex flex-wrap gap-2 justify-center'}>
                                                    {sortedProjects.map((project: IProject, index: number) => {
                                                        const colorSet: IProjectChipColor = PROJECT_CHIP_COLORS[index % PROJECT_CHIP_COLORS.length];
                                                        const isSelected: boolean = projectDir === project.rawProjectDir;
                                                        const displayName: string = projectDisplayNames.get(project.rawProjectDir) ?? project.rawProjectDir;
                                                        return (
                                                            <Button key={project.rawProjectDir} variant={'ghost'} type={'button'} onClick={() => setProjectDir(isSelected ? '' : project.rawProjectDir)}
                                                                    className={cn(
                                                                        'h-auto rounded-full border px-3.5 py-1.5 text-xs font-medium',
                                                                        isSelected ? colorSet.active : cn(colorSet.base, colorSet.hover),
                                                                    )}
                                                            >
                                                                <span className={cn('size-1.5 rounded-full shrink-0', colorSet.dot)}/>
                                                                <span className={'max-w-[220px] truncate'}>{displayName}</span>
                                                                {isSelected && (
                                                                    <HiOutlineChevronDoubleRight className={'size-3 shrink-0'}/>
                                                                )}
                                                            </Button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Notion divider */}
                                        <div className={'w-full h-px bg-border'}/>

                                        {/* Project directory — H3 + code-block-style input */}
                                        <div className={'w-full'}>
                                            <p className={'text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5'}>
                                                <HiOutlineFolder className={'size-3.5'}/>
                                                Project directory
                                                <span className={'normal-case font-normal tracking-normal text-text-muted/60 ml-1'}>— optional</span>
                                            </p>
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

                                        {/* Notion toggle — Allowed directories */}
                                        <details className={'w-full group'}>
                                            <summary className={'flex items-center gap-1.5 cursor-pointer select-none list-none text-xs text-text-muted hover:text-text transition-colors'}>
                                                <HiOutlineChevronDoubleRight className={'size-3 shrink-0 transition-transform group-open:rotate-90'}/>
                                                <span className={'font-medium'}>Allowed directories</span>
                                                <span className={'text-text-muted/60 ml-1'}>— advanced</span>
                                            </summary>
                                            <div className={'mt-3 pl-4 border-l-2 border-border'}>
                                                <div className={'flex items-center gap-2'}>
                                                    <input
                                                        type={'text'}
                                                        value={allowedDirInput}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAllowedDirInput(e.target.value)}
                                                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                                            if (e.key === 'Enter') handleAddAllowedDir();
                                                        }}
                                                        placeholder={'/Volumes/external-drive'}
                                                        className={'flex-1 px-3 py-2 text-sm font-mono bg-background border border-border rounded-lg text-text placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'}
                                                    />
                                                    <Button variant={'ghost'} size={'sm'} onClick={handleBrowseAllowedDir} isLoading={isBrowsingAllowedDir} disabled={isBrowsingAllowedDir}>
                                                        <HiOutlineFolder className={'size-4'}/>
                                                        Browse...
                                                    </Button>
                                                    <Button variant={'primary'} size={'sm'} onClick={handleAddAllowedDir} disabled={!allowedDirInput.trim()}>
                                                        Add
                                                    </Button>
                                                </div>
                                                {allowedDirs.length > 0 && (
                                                    <ul className={'mt-2 space-y-1'}>
                                                        {allowedDirs.map((allowedDir: string) => (
                                                            <li key={allowedDir} className={'flex items-center justify-between gap-2 px-2.5 py-1.5 bg-surface border border-border rounded-md'}>
                                                                <span className={'text-xs font-mono text-text truncate'}>{allowedDir}</span>
                                                                <Button onClick={() => handleRemoveAllowedDir(allowedDir)} className={'text-text-muted hover:text-error shrink-0 text-xs leading-none'}
                                                                        aria-label={'Remove'}>
                                                                    ✕
                                                                </Button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </details>

                                        {/* Notion quote block — how it works */}
                                        <div className={'w-full pl-3.5 border-l-[3px] border-primary/30'}>
                                            <p className={'text-xs text-text-muted leading-relaxed italic'}>
                                                Set a project directory, type a message, and Claude will work directly in your codebase.
                                            </p>
                                        </div>

                                        {/* Notion H3 — capability section */}
                                        <div className={'w-full'}>
                                            <p className={'text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-3'}>What Claude can do</p>

                                            {/* Numbered-list style capability rows */}
                                            <div className={'flex flex-col gap-2 mb-4'}>
                                                {CAPABILITY_ROWS.map(({icon, color, bg, label, desc}: ICapabilityRow, i: number) => (
                                                    <div key={label} className={'flex items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-border'}>
                                                        <span className={'text-[10px] font-mono text-text-muted/50 shrink-0 w-3'}>{i + 1}.</span>
                                                        <span className={cn('inline-flex items-center justify-center size-6 rounded-md shrink-0', bg)}>
                                                            <span className={color}>{icon}</span>
                                                        </span>
                                                        <span className={'text-xs font-medium text-text'}>{label}</span>
                                                        <span className={'text-xs text-text-muted ml-auto hidden sm:block truncate max-w-[200px]'}>{desc}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Bulleted capability pills */}
                                            <div className={'flex flex-wrap justify-center gap-2'}>
                                                <span className={'inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1'}>
                                                    <HiOutlineCode className={'size-3.5 text-primary'}/>
                                                    <span className={'text-xs text-text-muted'}>Read and edit files</span>
                                                </span>
                                                <span className={'inline-flex items-center gap-1.5 rounded-full bg-success/8 px-3 py-1'}>
                                                    <HiOutlineTerminal className={'size-3.5 text-success'}/>
                                                    <span className={'text-xs text-text-muted'}>Run commands</span>
                                                </span>
                                                <span className={'inline-flex items-center gap-1.5 rounded-full bg-warning/8 px-3 py-1'}>
                                                    <HiOutlineSearch className={'size-3.5 text-warning'}/>
                                                    <span className={'text-xs text-text-muted'}>Search codebase</span>
                                                </span>
                                                <span className={'inline-flex items-center gap-1.5 rounded-full bg-accent/8 px-3 py-1'}>
                                                    <HiOutlineBeaker className={'size-3.5 text-accent'}/>
                                                    <span className={'text-xs text-text-muted'}>Write tests</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Notion divider */}
                                        <div className={'w-full h-px bg-border'}/>

                                        {/* Keyboard shortcut hints */}
                                        <div className={'flex flex-wrap justify-center gap-x-4 gap-y-1'}>
                                            <span className={'text-[11px] text-text-muted'}>
                                                <kbd className={'px-2 py-1 rounded bg-primary/1 border border-primary/30 text-[10px] font-mono'}>Enter</kbd> to send
                                            </span>
                                            <span className={'text-[11px] text-text-muted'}>
                                                <kbd className={'px-2 py-1 rounded bg-primary/1 border border-primary/30 text-[10px] font-mono'}>Shift + Enter</kbd> for new line
                                            </span>
                                            <span className={'text-[11px] text-text-muted'}>Markdown supported</span>
                                            <span className={'text-[11px] text-text-muted'}>Voice input available</span>
                                        </div>

                                    </div>
                                </div>
                            ) : (
                                <div className={'flex flex-col w-full gap-4'}>
                                    {isLoadingOlderMessages && (
                                        <div className={'flex items-center justify-center py-1'}>
                                            <div className={'inline-flex items-center gap-2 text-xs text-text-muted'}>
                                                <IoMdRefresh className={'size-4 animate-spin'}/>
                                                <span>Loading older messages...</span>
                                            </div>
                                        </div>
                                    )}

                                    {!isLoadingOlderMessages && localHistoricalMessages.length > 0 && !(messagePagination?.hasMore ?? false) && (
                                        <div className={'flex items-center justify-center py-1'}>
                                            <span className={'text-[11px] text-text-muted/70'}>Start of conversation</span>
                                        </div>
                                    )}

                                    {/* Historical messages — sliced at edit cutoff when user edits from history */}
                                    {visibleHistoricalMessages.map((message: IMessage, index: number) => {
                                        const isUser: boolean = message.role === EMessageRole.USER;

                                        // Sub-agent prompt: a user message that follows an assistant message containing an Agent tool_use.
                                        // These are AI-generated delegation instructions, not human-typed messages.
                                        const prevMessage: IMessage | undefined = index > 0 ? visibleHistoricalMessages[index - 1] : undefined;
                                        const isSubAgentPrompt: boolean = isUser
                                            && prevMessage?.role === EMessageRole.ASSISTANT
                                            && Array.isArray(prevMessage.content)
                                            && prevMessage.content.some((block: ContentBlock) => block.type === 'tool_use' && (block as ToolUseBlock).name === 'Agent');

                                        return (
                                            <div key={message.uuid}>
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
                                                        tts={tts}
                                                        toolUseMap={toolUseMap}
                                                        toolResultMap={toolResultMap}
                                                        pendingApprovalToolUseId={pendingApprovalToolUseId}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Live messages (user + finalized assistant) */}
                                    {messages.filter((msg: IChatMessage) => {
                                        if (msg.role !== EMessageRole.ASSISTANT) return true;
                                        const text: string = extractMessageText(msg.content).toLowerCase();
                                        return !text.includes('prompt is too long');
                                    }).map((message: IChatMessage, index: number, filteredMessages: IChatMessage[]) => {
                                        // System notifications (e.g. compact_boundary) — render as inline divider
                                        if (message.role === EMessageRole.SYSTEM) {
                                            return (
                                                <div key={message.id} className={'flex items-center gap-3 my-1 px-1'}>
                                                    <div className={'flex-1 h-px bg-border/40'}/>
                                                    <span className={'text-xs text-text-muted/70 italic shrink-0'}>
                                                {typeof message.content === 'string' ? message.content : ''}
                                            </span>
                                                    <div className={'flex-1 h-px bg-border/40'}/>
                                                </div>
                                            );
                                        }

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
                                        const speakableText: string = extractSpeakableText(message.content);
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
                                                        {speakableText && (
                                                            <CopyMessageButton text={speakableText}/>
                                                        )}
                                                        {(!isUser && !isSyntheticMessage && speakableText) && (
                                                            <ReadAloudButton text={speakableText} messageId={message.id} tts={tts}/>
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
                                                            attachment.mimeType.startsWith('image/') && !attachment.mimeType.includes('heic') && !attachment.mimeType.includes('heif') ? (
                                                                <ImageThumbnail
                                                                    key={attachIdx}
                                                                    src={`data:${attachment.mimeType};base64,${attachment.data}`}
                                                                    alt={attachment.name}
                                                                    width={200}
                                                                    height={200}
                                                                    className={'rounded-lg max-w-48 max-h-48 object-contain'}
                                                                />
                                                            ) : (
                                                                <div key={attachIdx} className={'flex items-center gap-2 rounded-lg bg-background/50 border border-border/50 px-3 py-2'}>
                                                                    <span className={'text-xs font-medium text-text'}>{attachment.name}</span>
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                )}
                                                <MessageContent content={message.content} toolUseMap={toolUseMap} toolResultMap={toolResultMap} pendingApprovalToolUseId={pendingApprovalToolUseId}/>
                                            </BubbleShell>
                                        );
                                    })}

                                    {/* Streaming assistant response */}
                                    {streamingContent && (() => {
                                        const speakableStreamText: string = extractSpeakableText(streamingContent);
                                        return (
                                            <BubbleShell isUser={false} hasNonTextBlock={streamingContent.some((block: ContentBlock) => block.type !== 'text')}
                                                         metadata={speakableStreamText ? (
                                                             <div className={'flex items-center gap-2 mt-1 px-1'}>
                                                                 <ReadAloudButton text={''} messageId={STREAM_READ_ID} tts={tts} onSpeak={() => tts.startStreamRead(STREAM_READ_ID)}/>
                                                             </div>
                                                         ) : undefined}
                                            >
                                                <MessageContent content={streamingContent} toolUseMap={toolUseMap} toolResultMap={toolResultMap} pendingApprovalToolUseId={pendingApprovalToolUseId}/>
                                            </BubbleShell>
                                        );
                                    })()}

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
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pinned tool-approval card — floats over the bottom of the chat scroll area. The outer layer spans full width with a backdrop-blur scrim; the inner is centered to match ChatInput. */}
                    {pendingApproval && (
                        <div className={'absolute bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm pt-2'}>
                            <div ref={approvalRef} className={'w-full max-w-4xl lg:max-w-6xl mx-auto px-6 pb-3'}>
                                <ToolApprovalPrompt approval={pendingApproval} projectDir={projectDir} onRespond={handleApprovalResponse}/>
                            </div>
                        </div>
                    )}

                    {/* Scroll to bottom button — lifted above the pinned approval card when one is active */}
                    {showScrollButton && (
                        <Button variant={'ghost'} size={'icon'} onClick={handleScrollToBottomClick}
                                style={{bottom: 16 + approvalHeight}}
                                className={'absolute right-6 size-8 rounded-full bg-surface border border-border shadow-md text-text-muted hover:text-text'} title={'Scroll to bottom'}>
                            <FaArrowDown className={'size-4'}/>
                        </Button>
                    )}
                </div>

                {/* MCP servers side panel */}
                <MCPServersPanel contextInfo={contextInfo}/>
            </div>

            {/* Chat input */}
            <div className={'w-full max-w-4xl lg:max-w-6xl mx-auto px-6'}>
                {/* ContextBar — disabled until context tracking is redesigned */}
                {/*{hasContextData && (
                    <ContextBar inputTokens={inputTokens} outputTokens={outputTokens} contextWindow={contextWindow}/>
                )}*/}
                <div className={'flex items-center justify-end px-1 mb-1'}>
                    <VoiceSettingsPopover tts={tts}/>
                </div>
                {isContextLimitReached && (
                    <div className={'flex items-center gap-2 rounded-xl px-4 py-2.5 mb-2 bg-error/10 border border-error/20 text-error text-xs'}>
                        <HiOutlineExclamationCircle className={'size-4 shrink-0'}/>
                        <span className={'flex-1'}>Context limit reached — click the compact button in the header to summarise history and continue!</span>
                    </div>
                )}
                <ChatInput
                    onSend={handleSend}
                    onStop={stopExecution}
                    disabled={disabled || isContextLimitReached}
                    isLoading={isLoading}
                    selectedModel={selectedModel}
                    selectedEffort={selectedEffort}
                    thinking={thinking}
                    onModelChange={handleSwitchModel}
                    onEffortChange={setSelectedEffort}
                    onThinkingChange={handleThinkingChange}
                    ideStatus={ideStatus}
                    r2Configured={r2Configured}
                    groqConfigured={groqConfigured}
                    userMessageHistory={userMessageHistory}
                />
            </div>
        </div>
    );
}

export {ChatSessionView};
