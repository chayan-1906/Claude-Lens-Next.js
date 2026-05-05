import React from "react";
import type {ITask} from "@/types/task";
import {IProject} from "@/types/project";
import type {IMemory} from "@/types/memory";
import type {IUseTextToSpeechReturn} from "@/types/tts";
import type {IGetSessionPagination, ISession} from "@/types/session";
import {ISearchResponse, TSearchItem, TSearchScope} from "@/types/search";
import {IAttachment, IContextInfo, IIdeStatus, IPendingToolApproval} from "@/types/chat";
import {ContentBlock, IMessage, ThinkingBlock, ToolResultBlock, ToolUseBlock} from "@/types/message";
import type {IClaudeAccount, IGroqConfig, IMongoConfig, IPathMapping, IR2Config} from "@/types/setup";

/** ------------- Constants and Type Aliases ------------- */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface IProjectChipColor {
    base: string;
    hover: string;
    active: string;
    dot: string;
}

export interface ICapabilityRow {
    icon: React.ReactElement;
    color: string;
    bg: string;
    label: string;
    desc: string;
}


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
    r2Configured: boolean;
}

export interface ISessionPageProps {
    params: Promise<{ sessionId: string }>;
}

export interface IMessageBubbleProps {
    message: IMessage;
    index: number;
    sessionId?: string;
    isSubAgentPrompt?: boolean;
    canEdit?: boolean;
    onEdit?: (uuid: string) => void;
    onRegenerate?: (clickedIndex: number) => void;
    onStubbed?: (messageId: string) => void;
    tts?: IUseTextToSpeechReturn;
    toolUseMap?: Map<string, ToolUseBlock>;
    toolResultMap?: Map<string, ToolResultBlock>;
    pendingApprovalToolUseId?: string;
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
    toolUseMap?: Map<string, ToolUseBlock>;
    toolResultMap?: Map<string, ToolResultBlock>;
    pendingApprovalToolUseId?: string;
}

export interface IThinkingBlockProps {
    block: ThinkingBlock;
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
}

export interface IToolResultContentBlockProps {
    block: ToolResultBlock;
    toolUse?: ToolUseBlock;
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
}

export interface IStubModalProps {
    isOpen: boolean;
    onOpenChange: (v: boolean) => void;
    estimatedTokens: number;
    error: string | null;
    isStubbing: boolean;
    onStub: () => void;
}

export interface IToolCallBlockProps {
    name: string;
    input: Record<string, unknown>;
    toolResult?: ToolResultBlock;
}

export interface IBubbleShellProps {
    isUser: boolean;
    isSystemUser?: boolean;
    isSubAgentPrompt?: boolean;
    isSynthetic?: boolean;
    hasNonTextBlock: boolean;
    metadata?: React.ReactNode;
    children: React.ReactNode;
}

export interface IImageModalProps {
    src: string;
    alt: string;
    onClose: () => void;
}

export interface IImageThumbnailProps {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    unoptimized?: boolean;
    loading?: 'lazy' | 'eager';
}

export interface ICodeBlockProps {
    code: string;
    language?: string;
}

export interface ICopyMessageButtonProps {
    text: string;
}

export interface IReadAloudButtonProps {
    text: string;
    messageId: string;
    tts: IUseTextToSpeechReturn;
    /** When provided, called instead of tts.speak() — used for stream-read mode. */
    onSpeak?: () => void;
}

export interface IVoiceSettingsPopoverProps {
    tts: IUseTextToSpeechReturn;
    triggerClassName?: string;
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
    r2Configured: boolean;
}

export interface IDeleteMemoryButtonProps {
    projectDir: string;
}

export interface IDeleteSessionButtonProps {
    sessionId: string;
    sessionTitle: string;
    r2Configured: boolean;
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
    onSend: (text: string, attachments?: IAttachment[]) => void;
    onStop: () => void;
    disabled: boolean;
    isLoading: boolean;
    selectedModel: string;
    selectedEffort: string;
    thinking: boolean;
    onModelChange: (model: string) => void;
    onEffortChange: (effort: string) => void;
    onThinkingChange: (thinking: boolean) => void;
    ideStatus?: IIdeStatus | null;
    r2Configured: boolean;
    groqConfigured: boolean;
    userMessageHistory?: string[];
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
    initialPagination?: IGetSessionPagination;
    r2Configured: boolean;
    groqConfigured: boolean;
    localJsonlAvailable?: boolean;
    projects?: IProject[];
}

export interface IMcpServersPanelProps {
    contextInfo: IContextInfo | null;
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
    projectDir: string;
    onRespond: (requestId: string, decision: 'allow' | 'deny', reason?: string, allowAll?: boolean) => void;
}

export interface ISetupFormProps {
    initialConfigurations: IMongoConfig[];
    initialActiveConfigId: string;
    initialPathMappings: IPathMapping[];
    initialR2Config: IR2Config | null;
    initialGroqConfig: IGroqConfig | null;
    initialAccounts: IClaudeAccount[];
    initialClaudeConfigDir: string | null;
}

export interface IConfigCardProps {
    config: IMongoConfig;
    isActive: boolean;
    onEdit: (config: IMongoConfig) => void;
    onDelete: (config: IMongoConfig) => void;
    onActivate: (config: IMongoConfig) => void;
    onTest: (config: IMongoConfig) => void;
    isActivating: boolean;
}

export interface IConfigFormModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    editingConfig: IMongoConfig | null;
    onSaved: () => void;
}

export interface IPathMappingCardProps {
    mapping: IPathMapping;
    onEdit: (mapping: IPathMapping) => void;
    onDelete: (mapping: IPathMapping) => void;
    onMerge: (mapping: IPathMapping) => void;
    isMerging: boolean;
}

export interface IPathMappingFormModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    editingMapping: IPathMapping | null;
    onSaved: () => void;
}

export interface IRenameSessionModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    session: ISession;
    onSaved: (updatedSession: ISession) => void;
}

export interface IRenameProjectModalProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    project: IProject;
    onSaved: (updatedProject: IProject) => void;
}

export interface IModelConfig {
    value: string;
    label: string;
}

export interface IModelSelectorProps {
    selectedModel: string;
    selectedEffort: string;
    thinking: boolean;
    onModelChange: (model: string) => void;
    onEffortChange: (effort: string) => void;
    onThinkingChange: (thinking: boolean) => void;
    disabled?: boolean;
}

export interface ISearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultScope: TSearchScope;
    sessionId?: string;
    projectDir?: string;
}

export interface IResultGroupProps<T extends TSearchItem> {
    icon: React.ReactNode;
    label: string;
    items: T[];
    onSelect: (item: T) => void;
    onHover?: (item: TSearchItem) => void;
    activeItem?: TSearchItem | null;
    renderMeta?: (item: T) => React.ReactNode;
    renderSub?: (item: T) => string;
}

export interface IResultPreviewProps {
    item: TSearchItem | null;
    query: string;
}
