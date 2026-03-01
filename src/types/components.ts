import React from "react";
import type {IConversation} from "@/types/conversation";
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

export interface IConversationViewProps {
    conversation: IConversation;
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
