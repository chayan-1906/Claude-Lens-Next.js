"use client";

import React from "react";
import {generateUUID} from "@/utils/generateUUID";
import {NEXT_PUBLIC_BACKEND_WS_URL} from "../../config/config";
import {ContentBlock, EMessageRole, TextBlock, ThinkingBlock, ToolUseBlock} from "@/types/message";
import {
    BASE_RECONNECT_DELAY_MS,
    ClientMessage,
    EChatStatus,
    HEARTBEAT_INTERVAL_MS,
    IAssistantEvent,
    IChatMessage,
    IContextInfo,
    IEditSessionMessage,
    IIdeConnectedMessage,
    IIdeDisconnectedMessage,
    IIdeErrorMessage,
    IIdeSelectionChangedMessage,
    IIdeStatus,
    IPendingToolApproval,
    IProjectNotAvailableMessage,
    IResultEvent,
    ISendMessageOptions,
    IStreamEvent,
    IStreamInnerEvent,
    ISystemEvent,
    ITokenUsage,
    IToolApprovalAutoResolvedMessage,
    IToolApprovalRequestMessage,
    IUseClaudeChatReturn,
    IUserEvent,
    IWsErrorMessage,
    MAX_RECONNECT_ATTEMPTS,
    ServerMessage,
} from "@/types/chat";

function useClaudeChat(): IUseClaudeChatReturn {
    // --- Reactive state (drives UI) ---
    const [status, setStatus] = React.useState<EChatStatus>(EChatStatus.IDLE);
    const [messages, setMessages] = React.useState<IChatMessage[]>([]);
    const [streamingContent, setStreamingContent] = React.useState<ContentBlock[] | null>(null);
    const [contextInfo, setContextInfo] = React.useState<IContextInfo | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [retryable, setRetryable] = React.useState<boolean>(true);
    const [forkedSessionId, setForkedSessionId] = React.useState<string | null>(null);
    const [approvalQueue, setApprovalQueue] = React.useState<IPendingToolApproval[]>([]);
    // Derived — always the head of the queue; consumers see no API change
    const pendingApproval: IPendingToolApproval | null = approvalQueue[0] ?? null;
    const [ideStatus, setIdeStatus] = React.useState<IIdeStatus | null>(null);

    // --- Refs: WebSocket and timers ---
    const wsRef = React.useRef<WebSocket | null>(null);
    const heartbeatIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectAttemptsRef = React.useRef<number>(0);
    const reconnectTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Refs: session flags ---
    const isSessionActiveRef = React.useRef<boolean>(false);
    const intentionalCloseRef = React.useRef<boolean>(false);
    const pendingMessageRef = React.useRef<{ text: string; options?: ISendMessageOptions } | null>(null);
    const isEditSessionRef = React.useRef<boolean>(false);  // true while waiting for system event from edit_session
    const stopRequestedRef = React.useRef<boolean>(false);  // true after stopExecution() — cleared in process_exit

    // --- Refs: streaming ---
    const currentAssistantMessageIdRef = React.useRef<string | null>(null);
    const currentModelRef = React.useRef<string | null>(null);
    const currentUuidRef = React.useRef<string | null>(null);  // JSONL UUID from IAssistantEvent.uuid
    const streamBufferRef = React.useRef<ContentBlock[] | null>(null);
    const rafIdRef = React.useRef<number | null>(null);
    // true once the first content_block_delta arrives for the current message via stream_events —
    // prevents the assistant checkpoint event from overwriting the incrementally-built buffer.
    const streamEventActiveRef = React.useRef<boolean>(false);
    // Accumulates input_json_delta strings per block index for tool_use blocks.
    const inputJsonBufferRef = React.useRef<Record<number, string>>({});
    // Tracks the latest assistant event's per-call usage — used for accurate context display.
    // result.usage is cumulative across all turns; this ref holds the LAST call's actual context.
    const lastAssistantUsageRef = React.useRef<ITokenUsage | null>(null);

    // --- Refs: regenerate retry ---
    // Stores the pending regenerate payload so process_exit can auto-retry via resume_session
    // if the Claude process exited before the frontend received it (race condition).
    const regenerateRetryRef = React.useRef<{ text: string; options?: ISendMessageOptions } | null>(null);

    // --- Refs: stable function references for WS callbacks ---
    const handleServerMessageRef = React.useRef<(data: ServerMessage) => void>(() => {
    });
    const doSendRef = React.useRef<(text: string, options?: ISendMessageOptions) => void>(() => {
    });
    const connectRef = React.useRef<() => void>(() => {
    });

    // --- Heartbeat ---

    const stopHeartbeat = React.useCallback((): void => {
        if (heartbeatIntervalRef.current) {
            console.log('[useClaudeChat] Heartbeat stopped');
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    }, []);

    const startHeartbeat = React.useCallback((): void => {
        stopHeartbeat();
        console.log(`[useClaudeChat] Heartbeat started (interval: ${HEARTBEAT_INTERVAL_MS}ms)`);
        heartbeatIntervalRef.current = setInterval(() => {
            const ws: WebSocket | null = wsRef.current;
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({type: 'ping'}));
            }
        }, HEARTBEAT_INTERVAL_MS);
    }, [stopHeartbeat]);

    // --- Finalize current streaming content into a completed message ---

    const finalizeStreamingMessage = React.useCallback((): void => {
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        const content: ContentBlock[] | null = streamBufferRef.current;
        const messageId: string | null = currentAssistantMessageIdRef.current;
        const messageUuid: string | null = currentUuidRef.current;

        if (content && messageId) {
            console.log(`[useClaudeChat] Finalizing assistant message (id: ${messageId}, blocks: ${content.length})`);
            const completedMessage: IChatMessage = {
                id: generateUUID(),
                msgId: messageId,
                role: EMessageRole.ASSISTANT,
                content,
                timestamp: new Date(),
                model: currentModelRef.current ?? undefined,
                uuid: messageUuid ?? undefined,
            };
            setMessages((prev: IChatMessage[]) => [...prev, completedMessage]);
        } else {
            console.log('[useClaudeChat] Finalize called but nothing to finalize');
        }

        streamBufferRef.current = null;
        currentAssistantMessageIdRef.current = null;
        currentModelRef.current = null;
        currentUuidRef.current = null;
        streamEventActiveRef.current = false;
        inputJsonBufferRef.current = {};
        setStreamingContent(null);
    }, []);

    // --- Handle server messages ---

    const handleServerMessage = React.useCallback((data: ServerMessage): void => {
        // Drain/ignore buffered WS events that arrive after the user clicked Stop.
        // Only process_exit and session_stopped are allowed through — everything else
        // would re-trigger streaming UI or overwrite the IDLE state.
        if (stopRequestedRef.current && data.type !== 'process_exit' && data.type !== 'session_stopped' && data.type !== 'sync_complete' && data.type !== 'ide_connected' && data.type !== 'ide_disconnected' && data.type !== 'ide_selection_changed' && data.type !== 'ide_error' && data.type !== 'tool_approval_auto_resolved') {
            console.log(`[useClaudeChat] Ignoring post-stop event: ${data.type}`);
            return;
        }

        switch (data.type) {
            case 'system': {
                const event = data as ISystemEvent & { subtype?: string };

                // compact_boundary — Claude CLI executed /compact. Insert an inline system
                // notification so the user can see where in the conversation history was summarised.
                if (event.subtype === 'compact_boundary') {
                    console.log('[useClaudeChat] system → compact_boundary — inserting notification');
                    setMessages((prev: IChatMessage[]) => [
                        ...prev,
                        {
                            id: generateUUID(),
                            role: EMessageRole.SYSTEM,
                            content: 'Context compacted — conversation history summarised',
                            timestamp: new Date(),
                        },
                    ]);
                    break;
                }

                // Only 'init' carries session_id, model, tools — other subtypes
                // (task_started, task_progress, etc.) are informational and safe to ignore.
                if (event.subtype && event.subtype !== 'init') {
                    console.log(`[useClaudeChat] system → subtype: ${event.subtype} (ignored)`);
                    break;
                }
                console.log(`[useClaudeChat] system → session_id: ${event.session_id}, model: ${event.model}, tools: [${event.tools.join(', ')}], mcp_servers: [${event.mcp_servers?.map((s: {
                    name: string;
                    status: string
                }) => s.name).join(', ')}]`);
                setContextInfo({
                    sessionId: event.session_id,
                    model: event.model,
                    inputTokens: 0,
                    outputTokens: 0,
                    contextWindow: 0,
                    costUsd: 0,
                    tools: event.tools,
                    mcpServers: event.mcp_servers ?? [],
                });
                // If this system event came from an edit_session, capture the new session ID for redirect
                if (isEditSessionRef.current) {
                    isEditSessionRef.current = false;
                    console.log(`[useClaudeChat] edit_session fork detected — new session_id: ${event.session_id}`);
                    setForkedSessionId(event.session_id);
                }
                break;
            }

            case 'assistant': {
                // Response is arriving — no longer need to retry regenerate
                regenerateRetryRef.current = null;

                const event: IAssistantEvent = data as IAssistantEvent;
                const content: ContentBlock[] = event.message.content;
                const messageId: string = event.message.id;
                const blockTypes: string = content.map((b: ContentBlock) => b.type).join(', ');
                console.log(`[useClaudeChat] assistant → msg_id: ${messageId}, blocks: [${blockTypes}], stop_reason: ${event.message.stop_reason}, tokens: in=${event.message.usage?.input_tokens} out=${event.message.usage?.output_tokens}`);

                // Different assistant message → finalize the previous one
                if (currentAssistantMessageIdRef.current && currentAssistantMessageIdRef.current !== messageId) {
                    console.log(`[useClaudeChat] New assistant message detected (prev: ${currentAssistantMessageIdRef.current}), finalizing previous`);
                    finalizeStreamingMessage();
                }
                currentAssistantMessageIdRef.current = messageId;
                currentModelRef.current = event.message.model;
                currentUuidRef.current = event.uuid ?? null;

                // RAF-batched streaming update — only drive buffer from assistant when stream_events
                // are not active (backward-compat: no --include-partial-messages). When stream_events
                // are active they already built the buffer incrementally; assistant carries only the
                // current block and would overwrite previously-accumulated blocks.
                if (!streamEventActiveRef.current) {
                    streamBufferRef.current = content;
                    if (rafIdRef.current === null) {
                        rafIdRef.current = requestAnimationFrame((): void => {
                            if (streamBufferRef.current) {
                                setStreamingContent(streamBufferRef.current.slice());
                            }
                            rafIdRef.current = null;
                        });
                    }
                }

                // State transition: tool_running vs streaming
                const hasToolUse: boolean = content.some((block: ContentBlock) => block.type === 'tool_use');
                if (hasToolUse && event.message.stop_reason === 'tool_use') {
                    console.log('[useClaudeChat] Status → TOOL_RUNNING');
                    setStatus(EChatStatus.TOOL_RUNNING);
                } else {
                    setStatus(EChatStatus.STREAMING);
                }

                // Track per-call usage for accurate context display.
                // result.usage is cumulative across all turns — this captures the actual context
                // for the latest API call, which represents the true current context size.
                if (event.message.usage) {
                    lastAssistantUsageRef.current = event.message.usage;
                }
                break;
            }

            case 'user': {
                const event: IUserEvent = data as IUserEvent;
                const blockTypes: string = event.message.content.map((b: ContentBlock) => b.type).join(', ');
                console.log(`[useClaudeChat] user → blocks: [${blockTypes}]`);

                // Finalize any in-progress assistant streaming before appending tool_result
                if (currentAssistantMessageIdRef.current) {
                    finalizeStreamingMessage();
                }

                const userToolResult: IChatMessage = {
                    id: generateUUID(),
                    role: EMessageRole.USER,
                    content: event.message.content,
                    timestamp: new Date(),
                };
                setMessages((prev: IChatMessage[]) => [...prev, userToolResult]);
                break;
            }

            case 'result': {
                // Response fully completed — no longer need to retry regenerate
                regenerateRetryRef.current = null;

                const event: IResultEvent = data as IResultEvent;
                // Finalize FIRST — must never be blocked by any logging or parsing that could throw
                finalizeStreamingMessage();
                console.log(`[useClaudeChat] result → subtype: ${event.subtype}, is_error: ${event.is_error}, turns: ${event.num_turns}, cost: $${event.total_cost_usd?.toFixed(4)}, duration: ${event.duration_ms}ms, tokens: in=${event.usage?.input_tokens} out=${event.usage?.output_tokens}`);

                // Context update: use the LAST assistant event's per-call usage for accurate context.
                // result.usage is cumulative across all API calls/turns in the interaction —
                // e.g. 2 turns of ~120k each → result.usage shows 240k, but actual context is 120k.
                // The last assistant event's usage reflects the true current context size.
                const contextUsage: ITokenUsage | null = lastAssistantUsageRef.current;
                const resultUsage: ITokenUsage | undefined = event.usage;
                const contextInput: number = contextUsage
                    ? contextUsage.input_tokens + (contextUsage.cache_creation_input_tokens ?? 0) + (contextUsage.cache_read_input_tokens ?? 0)
                    : 0;
                // Use cumulative result.usage only for the zero-token guard (rejected API calls)
                const cumulativeInput: number = resultUsage
                    ? resultUsage.input_tokens + (resultUsage.cache_creation_input_tokens ?? 0) + (resultUsage.cache_read_input_tokens ?? 0)
                    : 0;
                const hasNonZeroTokens: boolean = cumulativeInput > 0 || (resultUsage?.output_tokens ?? 0) > 0;
                console.log(`[useClaudeChat] result context → contextInput: ${contextInput} (last call), cumulativeInput: ${cumulativeInput} (all turns), hasNonZeroTokens: ${hasNonZeroTokens}, modelUsage keys: ${event.modelUsage ? Object.keys(event.modelUsage).join(',') : 'none'}`);

                lastAssistantUsageRef.current = null;

                if (hasNonZeroTokens && contextInput > 0) {
                    setContextInfo((prev: IContextInfo | null) => {
                        if (!prev) return prev;
                        const modelKey: string | undefined = event.modelUsage ? Object.keys(event.modelUsage)[0] : undefined;
                        const modelData = modelKey ? event.modelUsage[modelKey] : null;
                        return {
                            ...prev,
                            inputTokens: contextInput,
                            outputTokens: contextUsage?.output_tokens ?? 0,
                            contextWindow: modelData?.contextWindow ?? prev.contextWindow,
                            costUsd: event.total_cost_usd,
                        };
                    });
                }

                // Handle errors — is_error: true is the authoritative signal.
                // Claude CLI reports "Prompt is too long" as is_error: true, subtype: 'success',
                // with all-zero tokens. The error text appears in the assistant message content,
                // NOT in event.result. Detect context limit via is_error + zero tokens.
                if (event.is_error) {
                    if (!hasNonZeroTokens) {
                        console.log('[useClaudeChat] Status → ERROR (context limit — is_error with zero tokens)');
                        setError('Context limit reached. Start a new session, or run /compact or /clear in the terminal to continue!');
                    } else {
                        console.log(`[useClaudeChat] Status → ERROR (is_error: true, subtype: ${event.subtype})`);
                        setError(event.result || event.subtype);
                    }
                    setStatus(EChatStatus.ERROR);
                    break;
                }

                console.log('[useClaudeChat] Status → IDLE (turn complete)');
                setStatus(EChatStatus.IDLE);
                break;
            }

            case 'rate_limit_event': {
                console.log('[useClaudeChat] rate_limit_event (ignored)');
                break;
            }

            case 'process_exit': {
                const exitEvent = data as { type: 'process_exit'; code: number | null };
                console.log(`[useClaudeChat] process_exit → code: ${exitEvent.code}`);

                // Skip IDLE transition when edit_session killed the old process — the new
                // session is about to start and will manage status itself. Setting IDLE here
                // would prematurely trigger the forkedSessionId redirect before the response.
                if (isEditSessionRef.current) {
                    console.log('[useClaudeChat] process_exit from killed old process (edit_session) — skipping IDLE');
                    break;
                }

                finalizeStreamingMessage();
                isSessionActiveRef.current = false;
                setApprovalQueue([]);

                // If the user explicitly stopped execution and no assistant response was
                // produced, remove the trailing user message so live state matches what
                // the backend will have after sync (the unanswered turn was never persisted).
                if (stopRequestedRef.current) {
                    stopRequestedRef.current = false;
                    setMessages((prev: IChatMessage[]) => {
                        if (prev.length > 0 && prev[prev.length - 1].role === EMessageRole.USER) {
                            console.log('[useClaudeChat] Removing unanswered user message after stop!');
                            return prev.slice(0, -1);
                        }
                        return prev;
                    });
                }

                // Race-condition guard: if the process exited BEFORE delivering a response
                // to a pending regenerate (user clicked Regenerate just before process_exit
                // arrived), automatically retry via resume_session so the backend spawns a
                // fresh claude process and the response is not silently lost.
                const pendingRegenerate = regenerateRetryRef.current;
                regenerateRetryRef.current = null;

                if (pendingRegenerate) {
                    console.log('[useClaudeChat] process_exit during pending regenerate — retrying via resume_session');
                    // isSessionActiveRef is now false → doSend will send resume_session
                    doSendRef.current(pendingRegenerate.text, pendingRegenerate.options);
                } else {
                    // Don't overwrite ERROR status — if result already set is_error, preserve it
                    setStatus((prev: EChatStatus) => prev === EChatStatus.ERROR ? prev : EChatStatus.IDLE);
                    console.log('[useClaudeChat] Status → IDLE (process exited, session deactivated)');
                }
                break;
            }

            case 'session_stopped': {
                console.log('[useClaudeChat] session_stopped — backend confirmed process killed');
                // Final cleanup — stopRequestedRef may already be cleared by process_exit
                // but clear it here too in case session_stopped arrives first
                stopRequestedRef.current = false;
                isSessionActiveRef.current = false;
                setApprovalQueue([]);
                setStatus(EChatStatus.IDLE);
                break;
            }

            case 'model_switched': {
                const switchEvent = data as { type: 'model_switched'; model: string };
                console.log(`[useClaudeChat] model_switched → model: ${switchEvent.model}`);
                // The re-spawned process will emit a new system event with updated model info.
                // Mark session active so follow-up messages use send_message instead of re-spawning.
                isSessionActiveRef.current = true;
                break;
            }

            case 'sync_complete': {
                // Backend finished JSONL sync — human user message + parentUuid backfill
                // are now in MongoDB. Dispatch event so ChatSessionView can refetch.
                const syncEvent = data as { type: 'sync_complete'; sessionId: string | null };
                console.log(`[useClaudeChat] sync_complete → sessionId: ${syncEvent.sessionId}`);
                window.dispatchEvent(new CustomEvent('sync-complete', {detail: {sessionId: syncEvent.sessionId}}));
                break;
            }

            case 'backup_complete': {
                const backupEvent = data as { type: 'backup_complete'; success: boolean; message?: string };
                console.log(`[useClaudeChat] backup_complete → success: ${backupEvent.success}${backupEvent.message ? `, message: ${backupEvent.message}` : ''}`);
                break;
            }

            case 'pong': {
                // Heartbeat response — no action needed
                break;
            }

            case 'error': {
                regenerateRetryRef.current = null;
                const wsError: IWsErrorMessage = data as IWsErrorMessage;
                console.error(`[useClaudeChat] Server error: ${wsError.message}`);
                setError(wsError.message);
                setRetryable(true);
                setStatus(EChatStatus.ERROR);
                break;
            }

            case 'project_not_available': {
                const event: IProjectNotAvailableMessage = data as IProjectNotAvailableMessage;
                console.warn(`[useClaudeChat] project_not_available → sessionId: ${event.sessionId}, projectDir: ${event.projectDir}`);
                setError(event.warning ?? `Project directory "${event.projectDir}" is not available on this device.`);
                setRetryable(false);
                setStatus(EChatStatus.ERROR);
                break;
            }

            case 'stream_event': {
                const streamEvent: IStreamEvent = data as IStreamEvent;
                const inner: IStreamInnerEvent = streamEvent.event;

                if (inner.type === 'message_start') {
                    // New message starting — finalize previous if different ID
                    const msgId: string = inner.message.id;
                    if (currentAssistantMessageIdRef.current && currentAssistantMessageIdRef.current !== msgId) {
                        finalizeStreamingMessage();
                    }
                    currentAssistantMessageIdRef.current = msgId;
                    currentModelRef.current = inner.message.model;
                    if (!streamBufferRef.current) {
                        streamBufferRef.current = [];
                    }
                } else if (inner.type === 'content_block_start') {
                    streamEventActiveRef.current = true;
                    if (!streamBufferRef.current) streamBufferRef.current = [];
                    const cb = inner.content_block;
                    let emptyBlock: ContentBlock;
                    if (cb.type === 'thinking') {
                        emptyBlock = {type: 'thinking', thinking: ''} as ThinkingBlock;
                    } else if (cb.type === 'tool_use' && 'id' in cb) {
                        const toolCb = cb as { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
                        emptyBlock = {type: 'tool_use', id: toolCb.id, name: toolCb.name, input: {}} as ToolUseBlock;
                    } else {
                        emptyBlock = {type: 'text', text: ''} as TextBlock;
                    }
                    streamBufferRef.current[inner.index] = emptyBlock;
                } else if (inner.type === 'content_block_delta') {
                    const buffer: ContentBlock[] | null = streamBufferRef.current;
                    if (!buffer || !buffer[inner.index]) break;
                    const delta = inner.delta;
                    let shouldScheduleRaf: boolean = false;
                    if (delta.type === 'thinking_delta') {
                        const block: ContentBlock = buffer[inner.index];
                        if (block.type === 'thinking') {
                            buffer[inner.index] = {...block, thinking: (block as ThinkingBlock).thinking + delta.thinking} as ThinkingBlock;
                            shouldScheduleRaf = true;
                        }
                    } else if (delta.type === 'text_delta') {
                        const block: ContentBlock = buffer[inner.index];
                        if (block.type === 'text') {
                            (block as TextBlock).text += delta.text;
                            shouldScheduleRaf = true;
                        }
                        setStatus(EChatStatus.STREAMING);
                    } else if (delta.type === 'input_json_delta') {
                        inputJsonBufferRef.current[inner.index] = (inputJsonBufferRef.current[inner.index] ?? '') + delta.partial_json;
                    }
                    if (shouldScheduleRaf && rafIdRef.current === null) {
                        rafIdRef.current = requestAnimationFrame((): void => {
                            if (streamBufferRef.current) {
                                setStreamingContent(streamBufferRef.current.slice());
                            }
                            rafIdRef.current = null;
                        });
                    }
                } else if (inner.type === 'content_block_stop') {
                    // Parse accumulated input JSON for tool_use blocks
                    const buffer: ContentBlock[] | null = streamBufferRef.current;
                    if (buffer && buffer[inner.index]?.type === 'tool_use') {
                        const json: string | undefined = inputJsonBufferRef.current[inner.index];
                        if (json) {
                            try {
                                (buffer[inner.index] as ToolUseBlock).input = JSON.parse(json);
                            } catch { /* partial JSON — leave input as {} */
                            }
                            delete inputJsonBufferRef.current[inner.index];
                        }
                    }
                } else if (inner.type === 'message_delta') {
                    // Transition to TOOL_RUNNING when the LLM finishes with tool_use.
                    // This is the authoritative stop_reason signal when stream_events are active —
                    // assistant event snapshots carry stop_reason: null during streaming.
                    if (inner.delta.stop_reason === 'tool_use') {
                        console.log('[useClaudeChat] stream_event message_delta → stop_reason: tool_use, Status → TOOL_RUNNING');
                        setStatus(EChatStatus.TOOL_RUNNING);
                    }
                }
                // message_stop is a no-op — result event handles final state
                break;
            }

            case 'tool_approval_request': {
                const event: IToolApprovalRequestMessage = data as IToolApprovalRequestMessage;
                console.log(`[useClaudeChat] tool_approval_request → requestId: ${event.requestId}, tool: ${event.toolName}, file: ${(event.toolInput as Record<string, unknown>).file_path}`);

                setApprovalQueue((prev: IPendingToolApproval[]) => [
                    ...prev,
                    {
                        requestId: event.requestId,
                        toolName: event.toolName,
                        toolInput: event.toolInput,
                        toolUseId: event.toolUseId,
                        projectActive: event.projectActive,
                    },
                ]);
                break;
            }

            case 'tool_approval_auto_resolved': {
                // IDE Apply/Reject auto-resolved the approval — dismiss the frontend prompt
                const autoResolvedEvent: IToolApprovalAutoResolvedMessage = data as IToolApprovalAutoResolvedMessage;
                console.log(`[useClaudeChat] tool_approval_auto_resolved → requestId: ${autoResolvedEvent.requestId}, decision: ${autoResolvedEvent.decision}`);
                setApprovalQueue((prev: IPendingToolApproval[]) =>
                    prev.filter((a: IPendingToolApproval) => a.requestId !== autoResolvedEvent.requestId),
                );
                break;
            }

            case 'ide_connected': {
                const event: IIdeConnectedMessage = data as IIdeConnectedMessage;
                console.log(`[useClaudeChat] ide_connected → ideName: ${event.ideName}, port: ${event.port}`);
                setIdeStatus((prev: IIdeStatus | null) => ({
                    ...(prev ?? {}),
                    connected: true,
                    ideName: event.ideName,
                    port: event.port,
                }));
                break;
            }

            case 'ide_disconnected': {
                const event: IIdeDisconnectedMessage = data as IIdeDisconnectedMessage;
                console.log(`[useClaudeChat] ide_disconnected → reason: ${event.reason ?? 'unknown'}`);
                setIdeStatus((prev: IIdeStatus | null) => prev ? {...prev, connected: false} : null);
                break;
            }

            case 'ide_selection_changed': {
                const event: IIdeSelectionChangedMessage = data as IIdeSelectionChangedMessage;
                setIdeStatus((prev: IIdeStatus | null) => ({
                    ...(prev ?? {connected: true}),
                    currentFile: event.filePath,
                    currentFileName: event.fileName,
                    currentLine: event.lineNumber,
                }));
                break;
            }

            case 'ide_error': {
                const event: IIdeErrorMessage = data as IIdeErrorMessage;
                console.warn(`[useClaudeChat] ide_error → ${event.message}`);
                setIdeStatus((prev: IIdeStatus | null) => prev ? {...prev, connected: false} : null);
                break;
            }

            default: {
                console.log(`[useClaudeChat] Unhandled event type: ${(data as Record<string, unknown>).type}`);
                break;
            }
        }
    }, [finalizeStreamingMessage]);

    React.useEffect(() => {
        handleServerMessageRef.current = handleServerMessage;
    }, [handleServerMessage]);

    // --- Send message over WebSocket ---

    const doSend = React.useCallback((text: string, options?: ISendMessageOptions): void => {
        const ws: WebSocket | null = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('[useClaudeChat] doSend called but WS not open');
            return;
        }

        let clientMessage: ClientMessage;

        if (options?.isEditSession) {
            clientMessage = {
                type: 'edit_session',
                sessionId: options.sessionId!,
                editAtUuid: options.editAtUuid,
                text,
            } as IEditSessionMessage;
            isSessionActiveRef.current = true;
            isEditSessionRef.current = true;
            console.log(`[useClaudeChat] Sending edit_session (sessionId: ${options.sessionId}, editAtUuid: ${options.editAtUuid ?? 'none'}, text: "${text.slice(0, 50)}...")`);
        } else if (!isSessionActiveRef.current) {
            if (options?.sessionId) {
                clientMessage = {
                    type: 'resume_session',
                    sessionId: options.sessionId,
                    text,
                    model: options?.model,
                    effort: options?.effort,
                    thinking: options?.thinking,
                    attachments: options?.attachments,
                    allowedDirs: options?.allowedDirs,
                };
                console.log(`[useClaudeChat] Sending resume_session (sessionId: ${options.sessionId}, model: ${options?.model ?? 'default'}, thinking: ${options?.thinking ?? 'default'}, attachments: ${options?.attachments?.length ?? 0}, allowedDirs: ${options?.allowedDirs?.length ?? 0}, text: "${text.slice(0, 50)}...")`);
            } else {
                clientMessage = {
                    type: 'new_session',
                    text,
                    projectDir: options?.projectDir,
                    model: options?.model,
                    effort: options?.effort,
                    thinking: options?.thinking,
                    attachments: options?.attachments,
                    allowedDirs: options?.allowedDirs,
                };
                console.log(`[useClaudeChat] Sending new_session (projectDir: ${options?.projectDir ?? 'none'}, model: ${options?.model ?? 'default'}, thinking: ${options?.thinking ?? 'default'}, attachments: ${options?.attachments?.length ?? 0}, allowedDirs: ${options?.allowedDirs?.length ?? 0}, text: "${text.slice(0, 50)}...")`);
            }
            isSessionActiveRef.current = true;
        } else {
            clientMessage = {type: 'send_message', text, attachments: options?.attachments};
            console.log(`[useClaudeChat] Sending send_message (attachments: ${options?.attachments?.length ?? 0}, text: "${text.slice(0, 50)}...")`);
        }

        ws.send(JSON.stringify(clientMessage));
        console.log('[useClaudeChat] Status → SENDING');
        setStatus(EChatStatus.SENDING);
    }, []);

    React.useEffect(() => {
        doSendRef.current = doSend;
    }, [doSend]);

    // --- Connect WebSocket ---

    const connect = React.useCallback((): void => {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            console.log('[useClaudeChat] connect() skipped — already open or connecting!');
            return;
        }

        const url: string = process.env.NODE_ENV === 'development' ? NEXT_PUBLIC_BACKEND_WS_URL : `ws://${window.location.hostname}:20261/ws`;
        // const url: string = NEXT_PUBLIC_BACKEND_WS_URL;
        console.log(`[useClaudeChat] Connecting to`, url);
        setStatus(EChatStatus.CONNECTING);
        intentionalCloseRef.current = false;

        const ws: WebSocket = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = (): void => {
            console.log(`[useClaudeChat] Connected to`, url);
            reconnectAttemptsRef.current = 0;
            startHeartbeat();

            // Request current IDE status immediately on connect
            ws.send(JSON.stringify({type: 'request_ide_status'}));

            const pending = pendingMessageRef.current;
            if (pending) {
                console.log(`[useClaudeChat] Flushing pending message:`, pending.text.slice(0, 50));
                pendingMessageRef.current = null;
                doSendRef.current(pending.text, pending.options);
            } else {
                console.log('[useClaudeChat] Status → IDLE (connected, no pending message)!');
                setStatus(EChatStatus.IDLE);
            }
        };

        ws.onmessage = (event: MessageEvent): void => {
            try {
                const data: ServerMessage = JSON.parse(event.data as string);
                handleServerMessageRef.current(data);
            } catch (error: unknown) {
                console.error('[useClaudeChat] Error handling server message:', error, event.data);
            }
        };

        ws.onclose = (event: CloseEvent): void => {
            console.log(`[useClaudeChat] Disconnected (code: ${event.code}, reason: "${event.reason}", intentional: ${intentionalCloseRef.current})`);
            stopHeartbeat();
            wsRef.current = null;
            isSessionActiveRef.current = false;

            if (!intentionalCloseRef.current) {
                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    const delay: number = BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptsRef.current);
                    reconnectAttemptsRef.current += 1;
                    console.log(`[useClaudeChat] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
                    setStatus(EChatStatus.CONNECTING);
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connectRef.current();
                    }, delay);
                } else {
                    console.error(`[useClaudeChat] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached → OFFLINE`);
                    setStatus(EChatStatus.OFFLINE);
                    setError('Connection lost. Max reconnection attempts reached.');
                }
            }
        };

        ws.onerror = (event: Event): void => {
            console.error('[useClaudeChat] WebSocket error:', event);
        };
    }, [startHeartbeat, stopHeartbeat]);

    React.useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    // Connect WebSocket eagerly on mount (enables IDE status indicator without sending a message)
    React.useEffect(() => {
        connectRef.current();
    }, []);

    // --- Public API ---

    const sendMessage = React.useCallback((text: string, options?: ISendMessageOptions): void => {
        const hasAttachments: boolean = !!(options?.attachments && options.attachments.length > 0);
        if (!text.trim() && !hasAttachments) return;

        const {attachments: _attachments, ...logOptions} = options ?? {};
        console.log(`[useClaudeChat] sendMessage called (text: "${text.slice(0, 50)}...", attachments: ${options?.attachments?.length ?? 0}, options: ${JSON.stringify(logOptions)})`);
        regenerateRetryRef.current = null;
        setError(null);

        const userMessage: IChatMessage = {
            id: generateUUID(),
            role: EMessageRole.USER,
            content: text,
            timestamp: new Date(),
            attachments: hasAttachments ? options!.attachments : undefined,
        };
        setMessages((prev: IChatMessage[]) => [...prev, userMessage]);

        const ws: WebSocket | null = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.log('[useClaudeChat] WS not open — queueing as pending message and connecting!');
            pendingMessageRef.current = {text, options};
            connectRef.current();
            return;
        }

        doSendRef.current(text, options);
    }, []);

    const editMessage = React.useCallback((keepUpToIndex: number, newText: string, options?: ISendMessageOptions): void => {
        console.log(`[useClaudeChat] editMessage — keepUpTo: ${keepUpToIndex}, editAtUuid: ${options?.editAtUuid ?? 'none'}, text: "${newText.slice(0, 50)}..."`);

        // Cancel any in-progress streaming
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        regenerateRetryRef.current = null;
        streamBufferRef.current = null;
        currentAssistantMessageIdRef.current = null;
        currentModelRef.current = null;
        currentUuidRef.current = null;
        setStreamingContent(null);
        setError(null);
        setForkedSessionId(null);

        // Force new session — edit_session always creates a fresh claude process
        isSessionActiveRef.current = false;

        // Trim messages to the edit point, then send as edit_session
        setMessages((prev: IChatMessage[]) => prev.slice(0, keepUpToIndex));
        sendMessage(newText, {...options, isEditSession: true});
    }, [sendMessage]);

    const regenerateMessage = React.useCallback((keepUpToIndex: number, resendText: string, options?: ISendMessageOptions): void => {
        console.log(`[useClaudeChat] regenerateMessage — keepUpTo: ${keepUpToIndex}, editAtUuid: ${options?.editAtUuid ?? 'none'}, text: "${resendText.slice(0, 50)}..."`);

        // Cancel any in-progress streaming
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        streamBufferRef.current = null;
        currentAssistantMessageIdRef.current = null;
        currentModelRef.current = null;
        currentUuidRef.current = null;
        setStreamingContent(null);
        setError(null);
        setForkedSessionId(null);

        // Force new session — edit_session always creates a fresh claude process
        isSessionActiveRef.current = false;

        // Trim messages (keeps user message, removes assistant response)
        setMessages((previousMessage: IChatMessage[]) => previousMessage.slice(0, keepUpToIndex));

        // Store payload so process_exit can auto-retry if the Claude process exits
        // in the race window between the user clicking Regenerate and process_exit arriving.
        regenerateRetryRef.current = {text: resendText, options: {...options, isEditSession: true}};

        // Send edit_session via WS without adding a user message to the list
        const webSocket: WebSocket | null = wsRef.current;
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
            doSendRef.current(resendText, {...options, isEditSession: true});
        } else {
            pendingMessageRef.current = {text: resendText, options: {...options, isEditSession: true}};
            connectRef.current();
        }
    }, []);

    const disconnect = React.useCallback((): void => {
        console.log('[useClaudeChat] disconnect() called (intentional close)!');
        intentionalCloseRef.current = true;

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        stopHeartbeat();

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        isSessionActiveRef.current = false;
        regenerateRetryRef.current = null;
        reconnectAttemptsRef.current = 0;
    }, [stopHeartbeat]);

    const respondToApproval = React.useCallback((requestId: string, decision: 'allow' | 'deny', reason?: string, allowAll?: boolean): void => {
        const ws: WebSocket | null = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('[useClaudeChat] respondToApproval called but WS not open');
            return;
        }
        console.log(`[useClaudeChat] Sending tool_approval_response (requestId: ${requestId}, decision: ${decision}, allowAll: ${allowAll ?? false})`);
        ws.send(JSON.stringify({
            type: 'tool_approval_response',
            requestId,
            decision,
            ...(reason ? {reason} : {}),
            ...(allowAll ? {allowAll: true} : {}),
        }));
        // Remove only the head — the next queued approval (if any) becomes visible
        setApprovalQueue((prev: IPendingToolApproval[]) => prev.slice(1));
    }, []);

    const stopExecution = React.useCallback((): void => {
        const ws: WebSocket | null = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('[useClaudeChat] stopExecution called but WS not open');
            return;
        }
        console.log('[useClaudeChat] Sending stop_execution — optimistic UI: stopping immediately');
        stopRequestedRef.current = true;

        // Optimistic UI: immediately stop rendering — don't wait for backend ack
        finalizeStreamingMessage();
        setStatus(EChatStatus.IDLE);
        isSessionActiveRef.current = false;
        regenerateRetryRef.current = null;
        // Drain any queued approvals — the process is being killed, they are stale
        setApprovalQueue([]);

        ws.send(JSON.stringify({type: 'stop_execution'}));
    }, [finalizeStreamingMessage]);

    const switchModel = React.useCallback((model: string, effort?: string, thinking?: boolean): void => {
        const ws: WebSocket | null = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('[useClaudeChat] switchModel called but WS not open');
            return;
        }
        if (!isSessionActiveRef.current) {
            console.warn('[useClaudeChat] switchModel called but no active session');
            return;
        }
        console.log(`[useClaudeChat] Sending switch_model → model: ${model}, effort: ${effort ?? 'default'}, thinking: ${thinking ?? 'default'}`);

        // Finalize any in-progress streaming before the process is killed
        finalizeStreamingMessage();
        setStatus(EChatStatus.SENDING);

        ws.send(JSON.stringify({type: 'switch_model', model, effort, thinking}));
    }, [finalizeStreamingMessage]);

    const backupSession = React.useCallback((sessionId?: string): void => {
        const ws: WebSocket | null = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn('[useClaudeChat] backupSession called but WS not open');
            return;
        }
        console.log(`[useClaudeChat] Sending backup_session${sessionId ? ` — sessionId: ${sessionId}` : ''}`);
        ws.send(JSON.stringify({type: 'backup_session', ...(sessionId && {sessionId})}));
    }, []);

    const retry = React.useCallback((): void => {
        console.log('[useClaudeChat] retry() called — resetting error and reconnecting');
        setError(null);
        setStatus(EChatStatus.IDLE);
        reconnectAttemptsRef.current = 0;
        connectRef.current();
    }, []);

    const clearMessages = React.useCallback((): void => {
        setMessages([]);
    }, []);

    const clearError = React.useCallback((): void => {
        setError(null);
        setStatus((prev: EChatStatus) => prev === EChatStatus.ERROR ? EChatStatus.IDLE : prev);
    }, []);

    // --- Cleanup on unmount ---

    React.useEffect(() => {
        return (): void => {
            console.log('[useClaudeChat] Unmounting — cleaning up WS, timers, RAF!');
            intentionalCloseRef.current = true;

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }

            stopHeartbeat();

            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [stopHeartbeat]);

    return {
        status,
        messages,
        streamingContent,
        contextInfo,
        ideStatus,
        error,
        retryable,
        forkedSessionId,
        pendingApproval,
        sendMessage,
        editMessage,
        regenerateMessage,
        respondToApproval,
        switchModel,
        backupSession,
        stopExecution,
        disconnect,
        retry,
        clearMessages,
        clearError,
    };
}

export {useClaudeChat};
