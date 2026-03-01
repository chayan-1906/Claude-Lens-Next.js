/** ------------- Constants and Type Aliases ------------- */

export type ThinkingBlock = {
    type: 'thinking';
    thinking: string;
}

export type TextBlock = {
    type: 'text';
    text: string;
}

export type ToolUseBlock = {
    type: 'tool_use';
    id: string;
    name: string;
    input: Record<string, unknown>;
}

export type ToolResultBlock = {
    type: 'tool_result';
    tool_use_id: string;
    content: string;
    is_error: boolean;
}

export type ContentBlock = ThinkingBlock | TextBlock | ToolUseBlock | ToolResultBlock;

export enum EMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
}


/** ------------- API response types ------------- */

export interface IMessage {
    messageId: string;
    uuid: string;
    conversationId: string;
    role: EMessageRole;
    content: string | ContentBlock[];
    aiModel?: string;
    timestamp: string;
    tokenUsage?: {
        input: number;
        output: number;
    };
    createdAt: string;
    updatedAt: string;
}


/** ------------- function params ------------- */
