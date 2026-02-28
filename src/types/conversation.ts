import type {IMessage} from "./message";

/** ------------- Constants and Type Aliases ------------- */

export enum EConversationSource {
    TERMINAL = 'terminal',
    WEBUI = 'webui',
}

export interface IConversation {
    conversationId: string;
    sessionId: string;
    title: string;
    aiModel?: string;
    projectDir: string;
    gitBranch?: string;
    slug?: string;
    source: EConversationSource;
    createdAt: string;
    updatedAt: string;
}

export interface IPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface IApiResponse {
    success: boolean;
    message?: string;
    error?: string;
}


/** ------------- API response types ------------- */

export interface IGetAllConversationsResponse extends IApiResponse {
    conversations: IConversation[];
    pagination: IPagination;
}

export interface IGetSessionResponse extends IApiResponse {
    conversation?: IConversation;
    messages?: IMessage[];
}

export interface IGetProjectsResponse extends IApiResponse {
    projects?: string[];
}


/** ------------- function params ------------- */

export interface IGetAllConversationsParams {
    title?: string;
    source?: string;
    projectDir?: string;
    page?: number;
    limit?: number;
}

export interface IGetSessionParams {
    sessionId: string;
}
