import type {IMessage} from "./message";

/** ------------- Constants and Type Aliases ------------- */

export enum ESessionSource {
    TERMINAL = 'terminal',
    WEBUI = 'webui',
}

export interface ISession {
    sessionInternalId: string;
    sessionId: string;
    title: string;
    aiModel?: string;
    projectDir: string;
    rawProjectDir: string;
    gitBranch?: string;
    slug?: string;
    description?: string;
    source: ESessionSource;
    contextTokensUsed?: number;
    contextWindowSize?: number;
    parentSessionId?: string;
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

export interface IGetSessionPagination {
    limit: number;
    totalCount: number;
    hasMore: boolean;
    nextCursor: string | null;
}


/** ------------- API response types ------------- */

export interface IGetAllSessionsResponse extends IApiResponse {
    sessions?: ISession[];
    pagination?: IPagination;
}

export interface IGetSessionResponse extends IApiResponse {
    session?: ISession;
    messages?: IMessage[];
    pagination?: IGetSessionPagination;
    localJsonlAvailable?: boolean;
}

export interface IUpdateSessionResponse extends IApiResponse {
    session?: ISession;
}

export interface IDeleteSessionResponse extends IApiResponse {
    deletedSessions?: number;
    deletedMessages?: number;
    deletedTasks?: number;
    deletedAttachments?: number;
}


/** ------------- function params ------------- */

export interface IGetAllSessionsParams {
    title?: string;
    source?: string;
    projectDir?: string;
    page?: number;
    limit?: number;
}

export interface IGetSessionParams {
    sessionId: string;
    limit?: number;
    cursor?: string;
}

export interface IUpdateSessionParams {
    sessionId: string;
    title?: string;
    description?: string;
}

export interface IDeleteSessionParams {
    sessionId: string;
    reclaimR2?: boolean;
}
