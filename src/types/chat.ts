import type {ContentBlock} from "./message";

/** ------------- Constants and Type Aliases ------------- */

export enum EChatStatus {
    IDLE = 'idle',
    CONNECTING = 'connecting',
    SENDING = 'sending',
    STREAMING = 'streaming',
    TOOL_RUNNING = 'tool_running',
    ERROR = 'error',
    OFFLINE = 'offline',
}

export type ChatState =
    | { status: EChatStatus.IDLE }
    | { status: EChatStatus.CONNECTING }
    | { status: EChatStatus.SENDING }
    | { status: EChatStatus.STREAMING; text: string }
    | { status: EChatStatus.TOOL_RUNNING; toolName: string }
    | { status: EChatStatus.ERROR; message: string }
    | { status: EChatStatus.OFFLINE };

export interface IChatMessage {
    role: 'user' | 'assistant';
    content: string | ContentBlock[];
    model?: string;
    timestamp: Date;
}

export interface IContextInfo {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    contextWindowMax: number;
    filesInContext: string[];
    model: string;
}

export interface IToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
    result?: string;
    isError?: boolean;
    isRunning: boolean;
}

/** Stream-json event envelope from backend (forwarded from Claude CLI) */
export interface IStreamJsonEvent {
    type: string;
    subtype?: string;
    timestamp?: string;
    /** Claude CLI outputs snake_case session_id */
    session_id?: string;
    cwd?: string;
    gitBranch?: string;
    slug?: string;
    uuid?: string;
    /** Top-level model field present on system events */
    model?: string;
    /** Top-level usage field present on result events */
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
    message?: {
        role: 'user' | 'assistant';
        content: string | ContentBlock[];
        model?: string;
        usage?: {
            input_tokens: number;
            output_tokens: number;
        };
    };
    customTitle?: string;
}


/** ------------- API response types ------------- */

/** Server → Client WebSocket messages (backend-specific, not stream-json) */
export interface IWebSocketProcessExitMessage {
    type: 'process_exit';
    code: number | null;
}

export interface IWebSocketPongMessage {
    type: 'pong';
}

export interface IWebSocketErrorMessage {
    type: 'error';
    message: string;
}

export type WebSocketServerMessage = IWebSocketProcessExitMessage | IWebSocketPongMessage | IWebSocketErrorMessage | IStreamJsonEvent;


/** ------------- function params ------------- */

/** Client → Server WebSocket messages */
export interface IWebSocketNewSessionMessage {
    type: 'new_session';
    text: string;
    projectDir?: string;
}

export interface IWebSocketResumeSessionMessage {
    type: 'resume_session';
    sessionId: string;
    text: string;
}

export interface IWebSocketPingMessage {
    type: 'ping';
}

export type WsClientMessage = IWebSocketNewSessionMessage | IWebSocketResumeSessionMessage | IWebSocketPingMessage;
