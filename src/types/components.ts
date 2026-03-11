import React from "react";
import type {ITask} from "@/types/task";
import type {IMemory} from "@/types/memory";
import type {ISession} from "@/types/session";
import type {ContentBlock, IMessage} from "@/types/message";

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
    projects: string[];
}

export interface ISessionPageProps {
    params: Promise<{ sessionId: string }>;
}

export interface ISessionViewProps {
    session: ISession;
    messages: IMessage[];
}

export interface IMessageBubbleProps {
    message: IMessage;
}

export interface IMessageContentProps {
    content: string | ContentBlock[];
}

export interface IThinkingBlockProps {
    thinking: string;
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
    fileName: string;
}

export interface IDeleteSessionButtonProps {
    sessionId: string;
    sessionTitle: string;
}

export interface IDeleteTasksButtonProps {
    sessionId: string;
}

export interface IChatInputProps {
    onSend: (text: string) => void;
    disabled: boolean;
    isLoading: boolean;
}

export interface IScrollToBottomProps {
    trigger: string;
}

export interface IChatSessionViewProps {
    isNewChat: boolean;
    session?: ISession;
    historicalMessages?: IMessage[];
}
