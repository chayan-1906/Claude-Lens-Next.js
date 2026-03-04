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
    gitBranch?: string;
    slug?: string;
    source: ESessionSource;
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

export interface IGetAllSessionsResponse extends IApiResponse {
    sessions?: ISession[];
    pagination?: IPagination;
}

export interface IGetSessionResponse extends IApiResponse {
    session?: ISession;
    messages?: IMessage[];
}

export interface IGetAllProjectsResponse extends IApiResponse {
    projects?: string[];
}

export interface IDeleteSessionResponse extends IApiResponse {
    deletedSessions?: number;
    deletedMessages?: number;
    deletedTasks?: number;
}

export interface IDeleteProjectResponse extends IApiResponse {
    deletedSessions?: number;
    deletedMessages?: number;
    deletedTasks?: number;
    deletedMemories?: number;
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
}

export interface IDeleteProjectParams {
    projectDir: string;
}

export interface IDeleteSessionParams {
    sessionId: string;
}
