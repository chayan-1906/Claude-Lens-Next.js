import type {ContentBlock} from "./message";
import {EMessageRole} from "./message";

/** ------------- Constants and Type Aliases ------------- */

export const MAX_RECONNECT_ATTEMPTS: number = 5;
export const HEARTBEAT_INTERVAL_MS: number = 30_000;
export const BASE_RECONNECT_DELAY_MS: number = 1_000;

export enum EChatStatus {
    IDLE = 'idle',
    CONNECTING = 'connecting',
    SENDING = 'sending',
    STREAMING = 'streaming',
    TOOL_RUNNING = 'tool_running',
    ERROR = 'error',
    OFFLINE = 'offline',
}

export interface ITokenUsage {
    input_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    output_tokens: number;
    service_tier?: string;
}

export interface IModelUsageEntry {
    inputTokens: number;
    outputTokens: number;
    costUSD: number;
    contextWindow: number;
}


/** ------------- API response types ------------- */

/** stream-json event: always the first event — session metadata */
export interface ISystemEvent {
    type: 'system';
    subtype: 'init';
    cwd: string;
    session_id: string;
    tools: string[];
    mcp_servers: { name: string; status: string }[];
    model: string;
    permissionMode: string;
    claude_code_version: string;
    uuid: string;
}

/** stream-json event: one or more — streams the assistant response */
export interface IAssistantEvent {
    type: 'assistant';
    session_id: string;
    uuid: string;
    parent_tool_use_id: string | null;
    message: {
        model: string;
        id: string;
        type: 'message';
        role: 'assistant';
        content: ContentBlock[];
        stop_reason: string | null;
        usage: ITokenUsage;
    };
}

/** stream-json event: always the last event — final usage, cost, duration */
export interface IResultEvent {
    type: 'result';
    subtype: 'success' | 'error';
    is_error: boolean;
    duration_ms: number;
    duration_api_ms: number;
    num_turns: number;
    result: string;
    session_id: string;
    total_cost_usd: number;
    usage: ITokenUsage;
    modelUsage: Record<string, IModelUsageEntry>;
    uuid: string;
}

/** stream-json event: informational, can be ignored */
export interface IRateLimitEvent {
    type: 'rate_limit_event';
    rate_limit_info: Record<string, unknown>;
    uuid: string;
    session_id: string;
}

/** Backend message: claude process exited (auto-sync triggered) */
export interface IProcessExitMessage {
    type: 'process_exit';
    code: number | null;
}

/** Backend message: heartbeat response */
export interface IPongMessage {
    type: 'pong';
}

/** Backend message: error (named IWsErrorMessage to avoid collision with native Error) */
export interface IWsErrorMessage {
    type: 'error';
    message: string;
}

export type ServerMessage = ISystemEvent | IAssistantEvent | IResultEvent | IRateLimitEvent | IProcessExitMessage | IPongMessage | IWsErrorMessage;

/** Live chat message displayed in ChatSessionView */
export interface IChatMessage {
    id: string;
    role: EMessageRole;
    content: string | ContentBlock[];
    timestamp: Date;
    model?: string;
}

/** Context info tracked during a chat session */
export interface IContextInfo {
    sessionId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    contextWindow: number;
    costUsd: number;
    tools: string[];
}

export interface IUseClaudeChatReturn {
    status: EChatStatus;
    messages: IChatMessage[];
    streamingContent: ContentBlock[] | null;
    contextInfo: IContextInfo | null;
    error: string | null;
    sendMessage: (text: string, options?: ISendMessageOptions) => void;
    disconnect: () => void;
    retry: () => void;
}


/** ------------- function params ------------- */

/** Client → Server: start a new claude session */
export interface INewSessionMessage {
    type: 'new_session';
    text: string;
    projectDir?: string;
}

/** Client → Server: resume an existing session */
export interface IResumeSessionMessage {
    type: 'resume_session';
    sessionId: string;
    text: string;
}

/** Client → Server: send follow-up message to active session */
export interface ISendMessageMessage {
    type: 'send_message';
    text: string;
}

/** Client → Server: heartbeat ping */
export interface IPingMessage {
    type: 'ping';
}

export type ClientMessage = INewSessionMessage | IResumeSessionMessage | ISendMessageMessage | IPingMessage;

/** Options passed to useClaudeChat.sendMessage */
export interface ISendMessageOptions {
    sessionId?: string;
    projectDir?: string;
}
