import type {IApiResponse, IPagination} from "./session";

/** ------------- Constants and Type Aliases ------------- */

export enum ETaskStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    DELETED = 'deleted',
}

export interface ITask {
    taskInternalId: string;
    sessionId: string;
    taskId: string;
    subject: string;
    description: string;
    activeForm?: string;
    status: ETaskStatus;
    blocks: string[];
    blockedBy: string[];
    createdAt: string;
    updatedAt: string;
}


/** ------------- API response types ------------- */

export interface IGetAllTasksResponse extends IApiResponse {
    tasks?: ITask[];
    pagination?: IPagination;
}

export interface IGetTaskResponse extends IApiResponse {
    task?: ITask;
}


/** ------------- function params ------------- */

export interface IGetAllTasksParams {
    sessionId?: string;
    page?: number;
    limit?: number;
}

export interface IGetTaskParams {
    sessionId: string;
    taskId: string;
}
