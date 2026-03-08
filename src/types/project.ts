import {IApiResponse} from "@/types/session";

/** ------------- Constants and Type Aliases ------------- */


/** ------------- API response types ------------- */

export interface IGetAllProjectsResponse extends IApiResponse {
    projects?: string[];
}

export interface IDeleteProjectResponse extends IApiResponse {
    deletedSessions?: number;
    deletedMessages?: number;
    deletedTasks?: number;
    deletedMemories?: number;
}


/** ------------- function params ------------- */

export interface IDeleteProjectParams {
    projectDir: string;
}
