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

export enum EUserMessageType {
    PLAIN = 'plain',
    SLASH_COMMAND = 'slash_command',
    COMMAND_OUTPUT = 'command_output',
    SYSTEM_CAVEAT = 'system_caveat',
}

export type ParsedUserMessage =
    | { type: EUserMessageType.PLAIN; text: string }
    | { type: EUserMessageType.SLASH_COMMAND; command: string; args: string; remainingText: string }
    | { type: EUserMessageType.COMMAND_OUTPUT; output: string }
    | { type: EUserMessageType.SYSTEM_CAVEAT }


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
