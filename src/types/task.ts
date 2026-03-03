import type {IApiResponse, IPagination} from "./session";

/** ------------- Constants and Type Aliases ------------- */

export enum ETaskStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    DELETED = 'deleted',
}

export interface ITask {
    taskId: string;
    sessionId: string;
    id: string;
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


/** ------------- function params ------------- */

export interface IGetAllTasksParams {
    sessionId?: string;
    page?: number;
    limit?: number;
}
