import type {ContentBlock} from "./message";
import {EMessageRole} from "./message";

/** ------------- Constants and Type Aliases ------------- */

/** A file attachment sent with a message (base64-encoded) */
export interface IAttachment {
    name: string;
    mimeType: string;
    data: string;   // base64-encoded file bytes
    size: number;
}

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
    cacheReadInputTokens: number;
    cacheCreationInputTokens: number;
    contextWindow: number;
    maxOutputTokens: number;
    costUSD: number;
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

/** stream-json event: tool_result-carrying user turn between two assistant turns */
export interface IUserEvent {
    type: 'user';
    uuid?: string;
    session_id: string;
    message: {
        role: 'user';
        content: ContentBlock[];
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

/** Backend message: project directory not found on this machine (remote resume) */
export interface IProjectNotAvailableMessage {
    type: 'project_not_available';
    sessionId: string;
    projectDir: string;
    warning: string;
    session: Record<string, unknown>;
    messages: Record<string, unknown>[];
}

/** Incremental token delta inside a stream_event content_block_delta */
export type IStreamDelta =
    | { type: 'thinking_delta'; thinking: string }
    | { type: 'text_delta'; text: string }
    | { type: 'input_json_delta'; partial_json: string }
    | { type: 'signature_delta'; signature: string };

/** Content block descriptor inside a stream_event content_block_start */
export type IStreamContentBlockStart =
    | { type: 'thinking'; thinking: string; signature: string }
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };

/** Discriminated union of all Anthropic API streaming event subtypes */
export type IStreamInnerEvent =
    | { type: 'message_start'; message: { id: string; model: string; [key: string]: unknown } }
    | { type: 'content_block_start'; index: number; content_block: IStreamContentBlockStart }
    | { type: 'content_block_delta'; index: number; delta: IStreamDelta }
    | { type: 'content_block_stop'; index: number }
    | { type: 'message_delta'; delta: { stop_reason: string | null; stop_sequence: string | null }; usage: { output_tokens: number } }
    | { type: 'message_stop' };

/** Anthropic API streaming event wrapper — emitted with --include-partial-messages */
export interface IStreamEvent {
    type: 'stream_event';
    event: IStreamInnerEvent;
    session_id: string;
    parent_tool_use_id: string | null;
    uuid: string;
}

/** Backend message: tool approval request (PreToolUse hook waiting for user decision) */
export interface IToolApprovalRequestMessage {
    type: 'tool_approval_request';
    requestId: string;
    sessionId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    toolUseId: string;
}

/** Backend message: confirms the Claude process was killed after stop_execution */
export interface ISessionStoppedMessage {
    type: 'session_stopped';
}

/** Backend message: JSONL sync completed — human user message + parentUuid backfill now in MongoDB */
export interface ISyncCompleteMessage {
    type: 'sync_complete';
    sessionId: string | null;
}

/** Backend message: confirms the model was switched mid-conversation */
export interface IModelSwitchedMessage {
    type: 'model_switched';
    model: string;
}

export type ServerMessage = ISystemEvent | IAssistantEvent | IUserEvent | IResultEvent | IRateLimitEvent | IProcessExitMessage | IPongMessage | IWsErrorMessage | IProjectNotAvailableMessage | IStreamEvent | IToolApprovalRequestMessage | ISessionStoppedMessage | ISyncCompleteMessage | IModelSwitchedMessage;

/** Live chat message displayed in ChatSessionView */
export interface IChatMessage {
    id: string;         // Unique render identity (crypto.randomUUID()) — safe to use as React key
    msgId?: string;     // Original Claude API msg_id — preserved for correlation; NOT unique across tool-call cycles
    role: EMessageRole;
    content: string | ContentBlock[];
    timestamp: Date;
    model?: string;
    uuid?: string;  // JSONL UUID from IAssistantEvent.uuid — set for assistant messages after stream completes
    attachments?: IAttachment[];  // file attachments sent with this user message (for bubble display)
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

/** Pending tool approval displayed in ChatSessionView */
export interface IPendingToolApproval {
    requestId: string;
    toolName: string;
    toolInput: Record<string, unknown>;
    toolUseId: string;
}

export interface IUseClaudeChatReturn {
    status: EChatStatus;
    messages: IChatMessage[];
    streamingContent: ContentBlock[] | null;
    contextInfo: IContextInfo | null;
    error: string | null;
    retryable: boolean;
    forkedSessionId: string | null;
    pendingApproval: IPendingToolApproval | null;
    sendMessage: (text: string, options?: ISendMessageOptions) => void;
    editMessage: (keepUpToIndex: number, newText: string, options?: ISendMessageOptions) => void;
    regenerateMessage: (keepUpToIndex: number, resendText: string, options?: ISendMessageOptions) => void;
    respondToApproval: (requestId: string, decision: 'allow' | 'deny', reason?: string, allowAll?: boolean) => void;
    switchModel: (model: string, effort?: string, thinking?: boolean) => void;
    stopExecution: () => void;
    disconnect: () => void;
    retry: () => void;
    clearMessages: () => void;
    clearError: () => void;
}


/** ------------- function params ------------- */

/** Client → Server: start a new claude session */
export interface INewSessionMessage {
    type: 'new_session';
    text: string;
    projectDir?: string;
    model?: string;
    effort?: string;
    thinking?: boolean;
    attachments?: IAttachment[];
}

/** Client → Server: resume an existing session */
export interface IResumeSessionMessage {
    type: 'resume_session';
    sessionId: string;
    text: string;
    model?: string;
    effort?: string;
    thinking?: boolean;
    attachments?: IAttachment[];
}

/** Client → Server: send follow-up message to active session */
export interface ISendMessageMessage {
    type: 'send_message';
    text: string;
    attachments?: IAttachment[];
}

/** Client → Server: heartbeat ping */
export interface IPingMessage {
    type: 'ping';
}

/** Client → Server: user's decision on a pending tool approval */
export interface IToolApprovalResponseMessage {
    type: 'tool_approval_response';
    requestId: string;
    decision: 'allow' | 'deny';
    reason?: string;
}

/** Client → Server: switch model mid-conversation (kill + re-spawn with --resume --model) */
export interface ISwitchModelMessage {
    type: 'switch_model';
    model: string;
    effort?: string;
    thinking?: boolean;
}

export type ClientMessage = INewSessionMessage | IResumeSessionMessage | ISendMessageMessage | IPingMessage | IEditSessionMessage | IStopExecutionMessage | ISwitchModelMessage | IToolApprovalResponseMessage;

/** Options passed to useClaudeChat.sendMessage */
export interface ISendMessageOptions {
    sessionId?: string;
    projectDir?: string;
    isEditSession?: boolean;  // true = send edit_session instead of resume/new/send_message
    editAtUuid?: string;      // UUID of last context message before the edit point (edit_session only)
    model?: string;           // model alias (opus/sonnet/haiku) for new_session or resume_session
    effort?: string;          // effort level (low/medium/high/max) — model-dependent
    thinking?: boolean;       // extended thinking toggle — true = enabled, false = disabled
    attachments?: IAttachment[];  // file attachments (base64) — uploaded to R2 by backend
}

/** Client → Server: fork or reconstruct a session at an edit/regenerate point */
export interface IEditSessionMessage {
    type: 'edit_session';
    sessionId: string;
    editAtUuid?: string;
    text: string;
    projectDir?: string;
}

/** Client → Server: interrupt/stop Claude's current execution (equivalent to Esc in terminal) */
export interface IStopExecutionMessage {
    type: 'stop_execution';
}
