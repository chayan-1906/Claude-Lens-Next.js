import React from "react";
import type {ITask} from "@/types/task";
import {IProject} from "@/types/project";
import type {IMemory} from "@/types/memory";
import type {ISession} from "@/types/session";
import type {ContentBlock, IMessage, ThinkingBlock, ToolResultBlock} from "@/types/message";
import {IPendingToolApproval} from "@/types/chat";

/** ------------- Constants and Type Aliases ------------- */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';


/** ------------- API response types ------------- */


/** ------------- function params ------------- */

export interface IButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    children: React.ReactNode;
}

export interface IModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onClose?: () => void;
    children: React.ReactNode;
    className?: string;
}

export interface IAppLayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    sidebarTitle?: string;
}

export interface ISidebarClientProps {
    projects: IProject[];
}

export interface ISessionPageProps {
    params: Promise<{ sessionId: string }>;
}

export interface IMessageBubbleProps {
    message: IMessage;
    index: number;
    sessionId?: string;
    canEdit?: boolean;
    onEdit?: (uuid: string) => void;
    onRegenerate?: (clickedIndex: number) => void;
    onStubbed?: (messageId: string) => void;
}

export interface IInlineMessageEditorProps {
    initialText: string;
    disabled: boolean;
    onSave: (newText: string) => void;
    onCancel: () => void;
}

export interface IMessageContentProps {
    content: string | ContentBlock[];
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
}

export interface IThinkingBlockProps {
    block: ThinkingBlock;
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
}

export interface IToolResultContentBlockProps {
    block: ToolResultBlock;
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
}

export interface IToolCallBlockProps {
    name: string;
    input: Record<string, unknown>;
}

export interface ICodeBlockProps {
    code: string;
    language?: string;
}

export interface ICopyMessageButtonProps {
    text: string;
}

export interface ITaskPageProps {
    params: Promise<{ sessionId: string; taskId: string }>;
}

export interface ITaskViewProps {
    task: ITask;
}

export interface IMemoryPageProps {
    params: Promise<{ projectDir: string }>;
}

export interface IMemoryViewProps {
    memory: IMemory;
}

export interface IDeleteProjectButtonProps {
    projectDir: string;
    projectName: string;
}

export interface IDeleteMemoryButtonProps {
    projectDir: string;
}

export interface IDeleteSessionButtonProps {
    sessionId: string;
    sessionTitle: string;
}

export interface IDeleteTasksButtonProps {
    sessionId: string;
}

export interface IExportProjectButtonProps {
    projectDir: string;
}

export interface IExportSessionButtonProps {
    projectDir: string;
    sessionId: string;
}

export interface IImportZipButtonProps {
    onImported: () => void;
}

export interface IChatInputProps {
    onSend: (text: string) => void;
    onStop: () => void;
    disabled: boolean;
    isLoading: boolean;
}

export interface IScrollToBottomProps {
    trigger: string;
}

export interface IContextBarProps {
    inputTokens: number;
    outputTokens: number;
    contextWindow: number | null;
}

export interface IChatSessionViewProps {
    isNewChat: boolean;
    session?: ISession;
    historicalMessages?: IMessage[];
}

export interface IDiffViewProps {
    toolName: string;
    filePath: string;
    oldString?: string;
    newString?: string;
    content?: string;     // Write tool — full file content
    replaceAll?: boolean;
}

export type DiffLineType = 'added' | 'removed' | 'context';

export interface IDiffLine {
    type: DiffLineType;
    text: string;
    lineNumber: number | null; // null for removed lines in the new-file column
}

export interface IToolApprovalPromptProps {
    approval: IPendingToolApproval;
    onRespond: (requestId: string, decision: 'allow' | 'deny', reason?: string, allowAll?: boolean) => void;
}
