"use client";

import React from "react";
import type {ContentBlock} from "@/types/message";
import {NEXT_PUBLIC_BACKEND_WS_URL} from "../../config/config";
import {ChatState, EChatStatus, IChatMessage, IContextInfo, IStreamJsonEvent, IToolCall} from "@/types/chat";

/** Exponential backoff delays in ms */
const RECONNECT_DELAYS: number[] = [1000, 2000, 4000, 8000, 16000];

/** Heartbeat interval to keep WebSocket alive */
const HEARTBEAT_INTERVAL: number = 30_000;

/** Default context window size for Claude models */
const DEFAULT_CONTEXT_WINDOW: number = 200_000;

/** Initial context info state */
const INITIAL_CONTEXT_INFO: IContextInfo = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    contextWindowMax: DEFAULT_CONTEXT_WINDOW,
    filesInContext: [],
    model: '',
};

function useClaudeChat(onProcessExit?: () => void) {
    const webSocketRef = React.useRef<WebSocket | null>(null);
    const reconnectAttemptRef = React.useRef<number>(0);
    const heartbeatTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
    const rafIdRef = React.useRef<number | null>(null);
    const pendingTextRef = React.useRef<string>('');
    const pendingContentBlocksRef = React.useRef<ContentBlock[]>([]);
    const connectRef = React.useRef<() => void>(null);
    const onProcessExitRef = React.useRef<(() => void) | undefined>(onProcessExit);

    const [chatState, setChatState] = React.useState<ChatState>({status: EChatStatus.IDLE});
    const [messages, setMessages] = React.useState<IChatMessage[]>([]);
    const [contextInfo, setContextInfo] = React.useState<IContextInfo>(INITIAL_CONTEXT_INFO);
    const [toolCalls, setToolCalls] = React.useState<IToolCall[]>([]);
    const [sessionId, setSessionId] = React.useState<string | null>(null);

    const clearHeartbeat = React.useCallback((): void => {
        if (heartbeatTimerRef.current) {
            clearInterval(heartbeatTimerRef.current);
            heartbeatTimerRef.current = null;
        }
    }, []);

    const startHeartbeat = React.useCallback((socket: WebSocket): void => {
        clearHeartbeat();
        heartbeatTimerRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({type: 'ping'}));
            }
        }, HEARTBEAT_INTERVAL);
    }, [clearHeartbeat]);

    const handleStreamEvent = React.useCallback((data: IStreamJsonEvent): void => {
        switch (data.type) {
            case 'system': {
                if (data.session_id) {
                    setSessionId(data.session_id);
                }
                setContextInfo((prevContextInfo: IContextInfo) => ({
                    ...prevContextInfo,
                    model: data.model || prevContextInfo.model,
                }));
                break;
            }

            case 'assistant': {
                if (data.message?.content && Array.isArray(data.message.content)) {
                    const blocks: ContentBlock[] = data.message.content;

                    for (const block of blocks) {
                        const {type} = block;
                        if (type === 'text') {
                            pendingTextRef.current = block.text;
                        }

                        if (type === 'tool_use') {
                            const {id: blockId, name, input} = block;
                            setToolCalls((previousToolCall: IToolCall[]) => {
                                const existing: IToolCall | undefined = previousToolCall.find(({id: toolCallId}) => toolCallId === blockId);
                                if (existing) return previousToolCall;
                                return [...previousToolCall, {
                                    id: blockId,
                                    name,
                                    input,
                                    isRunning: true,
                                }];
                            });
                            setChatState({status: EChatStatus.TOOL_RUNNING, toolName: name});
                        }

                        if (type === 'tool_result') {
                            const {tool_use_id, content, is_error} = block;
                            setToolCalls((previousToolCall: IToolCall[]) =>
                                previousToolCall.map((toolCall: IToolCall) =>
                                    toolCall.id === tool_use_id
                                        ? {...toolCall, result: content, isError: is_error, isRunning: false}
                                        : toolCall,
                                ),
                            );
                        }
                    }

                    pendingContentBlocksRef.current = blocks;

                    // Batch render with requestAnimationFrame to avoid markdown re-parse jank
                    if (!rafIdRef.current) {
                        rafIdRef.current = requestAnimationFrame(() => {
                            setChatState({status: EChatStatus.STREAMING, text: pendingTextRef.current});
                            rafIdRef.current = null;
                        });
                    }
                }

                // Track files read by Claude
                if (data.message?.content && Array.isArray(data.message.content)) {
                    for (const block of data.message.content) {
                        const {type} = block;
                        if (type === 'tool_use' && (block.name === 'Read' || block.name === 'read_file')) {
                            const filePath: string | undefined = (block.input as Record<string, unknown>)?.file_path as string | undefined;
                            if (filePath) {
                                setContextInfo((prevContextInfo: IContextInfo) => ({
                                    ...prevContextInfo,
                                    filesInContext: [...new Set([...prevContextInfo.filesInContext, filePath])],
                                }));
                            }
                        }
                    }
                }

                // Update model from assistant message
                if (data.message?.model) {
                    setContextInfo((prevContextInfo: IContextInfo) => ({
                        ...prevContextInfo,
                        model: data.message!.model!,
                    }));
                }
                break;
            }

            case 'result': {
                // Cancel any pending RAF so it can't re-apply STREAMING after we set IDLE
                if (rafIdRef.current) {
                    cancelAnimationFrame(rafIdRef.current);
                    rafIdRef.current = null;
                }

                // Finalize the assistant message
                const finalContent: ContentBlock[] = pendingContentBlocksRef.current.length > 0
                    ? pendingContentBlocksRef.current
                    : [{type: 'text' as const, text: pendingTextRef.current}];

                setMessages((previousChatMessage: IChatMessage[]) => [...previousChatMessage, {
                    role: 'assistant',
                    content: finalContent,
                    model: data.message?.model || contextInfo.model,
                    timestamp: new Date(),
                }]);

                // Update token usage — result event has top-level `usage`, not inside `message`
                if (data.usage) {
                    setContextInfo((prevContextInfo: IContextInfo) => ({
                        ...prevContextInfo,
                        inputTokens: data.usage!.input_tokens,
                        outputTokens: data.usage!.output_tokens,
                        totalTokens: data.usage!.input_tokens + data.usage!.output_tokens,
                    }));
                }

                // Reset streaming state
                pendingTextRef.current = '';
                pendingContentBlocksRef.current = [];
                setToolCalls([]);
                setChatState({status: EChatStatus.IDLE});
                break;
            }

            default:
                break;
        }
    }, [contextInfo.model]);

    const connect = React.useCallback((): void => {
        if (webSocketRef.current?.readyState === WebSocket.OPEN || webSocketRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        setChatState({status: EChatStatus.CONNECTING});

        const webSocketUrl: string = `${NEXT_PUBLIC_BACKEND_WS_URL}/ws`;
        const webSocket: WebSocket = new WebSocket(webSocketUrl);

        webSocket.onopen = (): void => {
            reconnectAttemptRef.current = 0;
            setChatState({status: EChatStatus.IDLE});
            startHeartbeat(webSocket);
        };

        webSocket.onmessage = (event: MessageEvent): void => {
            try {
                const data = JSON.parse(event.data as string);

                // DEBUG: log every incoming event
                console.log('[WS event]', JSON.stringify(data, null, 2));

                // Handle backend-specific messages
                if (data.type === 'pong') return;

                if (data.type === 'error') {
                    setChatState({status: EChatStatus.ERROR, message: data.message});
                    return;
                }

                if (data.type === 'process_exit') {
                    setChatState({status: EChatStatus.IDLE});
                    // Delay to allow backend auto-sync to complete before refreshing sidebar
                    setTimeout(() => onProcessExitRef.current?.(), 3000);
                    return;
                }

                // Handle stream-json events
                handleStreamEvent(data as IStreamJsonEvent);
            } catch {
                // Skip non-JSON messages
            }
        };

        webSocket.onclose = (): void => {
            clearHeartbeat();
            webSocketRef.current = null;

            const delay: number = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
            reconnectAttemptRef.current++;

            if (reconnectAttemptRef.current <= RECONNECT_DELAYS.length) {
                setTimeout(() => connectRef.current?.(), delay);
            } else {
                setChatState({status: EChatStatus.OFFLINE});
            }
        };

        webSocket.onerror = (): void => {
            // onclose will fire after this, handling reconnection
        };

        webSocketRef.current = webSocket;
    }, [clearHeartbeat, startHeartbeat, handleStreamEvent, chatState.status]);

    const disconnect = React.useCallback((): void => {
        clearHeartbeat();
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
        webSocketRef.current?.close();
        webSocketRef.current = null;
    }, [clearHeartbeat]);

    const sendMessage = React.useCallback((text: string, options?: { projectDir?: string; resumeSessionId?: string }): void => {
        if (!webSocketRef.current || webSocketRef.current.readyState !== WebSocket.OPEN) {
            setChatState({status: EChatStatus.OFFLINE});
            return;
        }

        // Add user message to list immediately
        setMessages((previousChatMessage: IChatMessage[]) => [...previousChatMessage, {
            role: 'user',
            content: text,
            timestamp: new Date(),
        }]);

        setChatState({status: EChatStatus.SENDING});
        pendingTextRef.current = '';
        pendingContentBlocksRef.current = [];
        setToolCalls([]);

        if (options?.resumeSessionId) {
            webSocketRef.current.send(JSON.stringify({
                type: 'resume_session',
                sessionId: options.resumeSessionId,
                text,
            }));
        } else {
            webSocketRef.current.send(JSON.stringify({
                type: 'new_session',
                text,
                ...(options?.projectDir ? {projectDir: options.projectDir} : {}),
            }));
        }
    }, []);

    // Keep refs in sync with latest values
    React.useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    React.useEffect(() => {
        onProcessExitRef.current = onProcessExit;
    }, [onProcessExit]);

    // Cleanup on unmount
    React.useEffect(() => {
        return (): void => {
            disconnect();
        };
    }, [disconnect]);

    const reset = React.useCallback((): void => {
        setChatState({status: EChatStatus.IDLE});
        setMessages([]);
        setContextInfo(INITIAL_CONTEXT_INFO);
        setToolCalls([]);
        setSessionId(null);
        pendingTextRef.current = '';
        pendingContentBlocksRef.current = [];
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }
    }, []);

    const isStreaming: boolean = chatState.status === EChatStatus.STREAMING || chatState.status === EChatStatus.SENDING || chatState.status === EChatStatus.TOOL_RUNNING;
    const isOnline: boolean = chatState.status !== EChatStatus.OFFLINE;

    return {chatState, messages, contextInfo, toolCalls, sessionId, isStreaming, isOnline, connect, disconnect, sendMessage, setMessages, reset};
}

export {useClaudeChat};
