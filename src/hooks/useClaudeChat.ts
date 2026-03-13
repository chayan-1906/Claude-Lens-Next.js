"use client";

import React from "react";
import {ContentBlock, EMessageRole} from "@/types/message";
import {NEXT_PUBLIC_BACKEND_WS_URL} from "../../config/config";
import {
    BASE_RECONNECT_DELAY_MS,
    ClientMessage,
    EChatStatus,
    HEARTBEAT_INTERVAL_MS,
    IAssistantEvent,
    IChatMessage,
    IContextInfo,
    IResultEvent,
    ISendMessageOptions,
    ISystemEvent, ITokenUsage,
    IUseClaudeChatReturn,
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

    // --- Refs: WebSocket and timers ---
    const wsRef = React.useRef<WebSocket | null>(null);
    const heartbeatIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectAttemptsRef = React.useRef<number>(0);
    const reconnectTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Refs: session flags ---
    const isSessionActiveRef = React.useRef<boolean>(false);
    const intentionalCloseRef = React.useRef<boolean>(false);
    const pendingMessageRef = React.useRef<{ text: string; options?: ISendMessageOptions } | null>(null);

    // --- Refs: streaming ---
    const currentAssistantMessageIdRef = React.useRef<string | null>(null);
    const currentModelRef = React.useRef<string | null>(null);
    const streamBufferRef = React.useRef<ContentBlock[] | null>(null);
    const rafIdRef = React.useRef<number | null>(null);

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

        if (content && messageId) {
            console.log(`[useClaudeChat] Finalizing assistant message (id: ${messageId}, blocks: ${content.length})`);
            const completedMessage: IChatMessage = {
                id: messageId,
                role: EMessageRole.ASSISTANT,
                content,
                timestamp: new Date(),
                model: currentModelRef.current ?? undefined,
            };
            setMessages((prev: IChatMessage[]) => [...prev, completedMessage]);
        } else {
            console.log('[useClaudeChat] Finalize called but nothing to finalize');
        }

        streamBufferRef.current = null;
        currentAssistantMessageIdRef.current = null;
        currentModelRef.current = null;
        setStreamingContent(null);
    }, []);

    // --- Handle server messages ---

    const handleServerMessage = React.useCallback((data: ServerMessage): void => {
        switch (data.type) {
            case 'system': {
                const event: ISystemEvent = data as ISystemEvent;
                console.log(`[useClaudeChat] system → session_id: ${event.session_id}, model: ${event.model}, tools: [${event.tools.join(', ')}]`);
                setContextInfo({
                    sessionId: event.session_id,
                    model: event.model,
                    inputTokens: 0,
                    outputTokens: 0,
                    contextWindow: 0,
                    costUsd: 0,
                    tools: event.tools,
                });
                break;
            }

            case 'assistant': {
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

                // RAF-batched streaming update
                streamBufferRef.current = content;
                if (rafIdRef.current === null) {
                    rafIdRef.current = requestAnimationFrame(() => {
                        if (streamBufferRef.current) {
                            setStreamingContent(streamBufferRef.current);
                        }
                        rafIdRef.current = null;
                    });
                }

                // State transition: tool_running vs streaming
                const hasToolUse: boolean = content.some((block: ContentBlock) => block.type === 'tool_use');
                if (hasToolUse && event.message.stop_reason === 'tool_use') {
                    console.log('[useClaudeChat] Status → TOOL_RUNNING');
                    setStatus(EChatStatus.TOOL_RUNNING);
                } else {
                    setStatus(EChatStatus.STREAMING);
                }

                // Update token usage (include cache tokens in input count)
                if (event.message.usage) {
                    const usage: ITokenUsage = event.message.usage;
                    const totalInput: number = usage.input_tokens
                        + (usage.cache_creation_input_tokens ?? 0)
                        + (usage.cache_read_input_tokens ?? 0);
                    setContextInfo((prev: IContextInfo | null) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            inputTokens: totalInput,
                            outputTokens: usage.output_tokens,
                        };
                    });
                }
                break;
            }

            case 'result': {
                const event: IResultEvent = data as IResultEvent;
                // Finalize FIRST — must never be blocked by any logging or parsing that could throw
                finalizeStreamingMessage();
                console.log(`[useClaudeChat] result → subtype: ${event.subtype}, is_error: ${event.is_error}, turns: ${event.num_turns}, cost: $${event.total_cost_usd?.toFixed(4)}, duration: ${event.duration_ms}ms, tokens: in=${event.usage?.input_tokens} out=${event.usage?.output_tokens}`);

                // Update context with final usage (include cache tokens)
                const resultUsage: ITokenUsage | undefined = event.usage;
                if (resultUsage) {
                    const resultTotalInput: number = resultUsage.input_tokens
                        + (resultUsage.cache_creation_input_tokens ?? 0)
                        + (resultUsage.cache_read_input_tokens ?? 0);
                    setContextInfo((prev: IContextInfo | null) => {
                        if (!prev) return prev;
                        const modelKey: string | undefined = event.modelUsage ? Object.keys(event.modelUsage)[0] : undefined;
                        const modelUsage = modelKey ? event.modelUsage[modelKey] : null;
                        return {
                            ...prev,
                            inputTokens: resultTotalInput,
                            outputTokens: resultUsage.output_tokens,
                            contextWindow: modelUsage?.contextWindow ?? prev.contextWindow,
                            costUsd: event.total_cost_usd,
                        };
                    });
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
                finalizeStreamingMessage();
                isSessionActiveRef.current = false;
                console.log('[useClaudeChat] Status → IDLE (process exited, session deactivated)');
                setStatus(EChatStatus.IDLE);
                break;
            }

            case 'pong': {
                // Heartbeat response — no action needed
                break;
            }

            case 'error': {
                const wsError: IWsErrorMessage = data as IWsErrorMessage;
                console.error(`[useClaudeChat] Server error: ${wsError.message}`);
                setError(wsError.message);
                setStatus(EChatStatus.ERROR);
                break;
            }

            default: {
                console.log(`[useClaudeChat] Unknown event type: ${(data as Record<string, unknown>).type}`);
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

        if (!isSessionActiveRef.current) {
            if (options?.sessionId) {
                clientMessage = {type: 'resume_session', sessionId: options.sessionId, text};
                console.log(`[useClaudeChat] Sending resume_session (sessionId: ${options.sessionId}, text: "${text.slice(0, 50)}...")`);
            } else {
                clientMessage = {type: 'new_session', text, projectDir: options?.projectDir};
                console.log(`[useClaudeChat] Sending new_session (projectDir: ${options?.projectDir ?? 'none'}, text: "${text.slice(0, 50)}...")`);
            }
            isSessionActiveRef.current = true;
        } else {
            clientMessage = {type: 'send_message', text};
            console.log(`[useClaudeChat] Sending send_message (text: "${text.slice(0, 50)}...")`);
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

        const wsUrl: string = NEXT_PUBLIC_BACKEND_WS_URL;
        if (!wsUrl) {
            console.error('[useClaudeChat] NEXT_PUBLIC_BACKEND_WS_URL is empty!');
            setError('WebSocket URL not configured (NEXT_PUBLIC_BACKEND_WS_URL)!');
            setStatus(EChatStatus.ERROR);
            return;
        }

        const url: string = wsUrl.endsWith('/ws') ? wsUrl : `${wsUrl}/ws`;
        console.log(`[useClaudeChat] Connecting to`, url);
        setStatus(EChatStatus.CONNECTING);
        intentionalCloseRef.current = false;

        const ws: WebSocket = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = (): void => {
            console.log(`[useClaudeChat] Connected to`, url);
            reconnectAttemptsRef.current = 0;
            startHeartbeat();

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
            } catch {
                console.error('[useClaudeChat] Failed to parse server message:', event.data);
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

    // --- Public API ---

    const sendMessage = React.useCallback((text: string, options?: ISendMessageOptions): void => {
        if (!text.trim()) return;

        console.log(`[useClaudeChat] sendMessage called (text: "${text.slice(0, 50)}...", options: ${JSON.stringify(options ?? {})})`);
        setError(null);

        const userMessage: IChatMessage = {
            id: crypto.randomUUID(),
            role: EMessageRole.USER,
            content: text,
            timestamp: new Date(),
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
        console.log(`[useClaudeChat] editMessage — keepUpTo: ${keepUpToIndex}, text: "${newText.slice(0, 50)}..."`);

        // Cancel any in-progress streaming
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        streamBufferRef.current = null;
        currentAssistantMessageIdRef.current = null;
        currentModelRef.current = null;
        setStreamingContent(null);
        setError(null);

        // Trim messages to the edit point, then re-send
        // React 18 batches both setMessages calls: first slices, then appends the new user message
        setMessages((prev: IChatMessage[]) => prev.slice(0, keepUpToIndex));
        sendMessage(newText, options);
    }, [sendMessage]);

    const regenerateMessage = React.useCallback((keepUpToIndex: number, resendText: string, options?: ISendMessageOptions): void => {
        console.log(`[useClaudeChat] regenerateMessage — keepUpTo: ${keepUpToIndex}, text: "${resendText.slice(0, 50)}..."`);

        // Cancel any in-progress streaming
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        streamBufferRef.current = null;
        currentAssistantMessageIdRef.current = null;
        currentModelRef.current = null;
        setStreamingContent(null);
        setError(null);

        // Trim messages (keeps user message, removes assistant response)
        setMessages((previousMessage: IChatMessage[]) => previousMessage.slice(0, keepUpToIndex));

        // Send via WS without adding a user message to the list
        const webSocket: WebSocket | null = wsRef.current;
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
            doSendRef.current(resendText, options);
        } else {
            pendingMessageRef.current = {text: resendText, options};
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
        reconnectAttemptsRef.current = 0;
    }, [stopHeartbeat]);

    const retry = React.useCallback((): void => {
        console.log('[useClaudeChat] retry() called — resetting error and reconnecting');
        setError(null);
        setStatus(EChatStatus.IDLE);
        reconnectAttemptsRef.current = 0;
        connectRef.current();
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

    return {status, messages, streamingContent, contextInfo, error, sendMessage, editMessage, regenerateMessage, disconnect, retry};
}

export {useClaudeChat};
