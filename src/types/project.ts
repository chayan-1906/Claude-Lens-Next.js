import {IApiResponse} from "@/types/session";

/** ------------- Constants and Type Aliases ------------- */

export interface IProject {
    rawProjectDir: string;
    projectDir: string;
    customName?: string;
    description?: string;
}

export interface IRenameProjectParams {
    projectDir: string;
    customName: string;
    description?: string;
}

export interface IRenameProjectResponse extends IApiResponse {
    project?: IProject;
}


/** ------------- API response types ------------- */

export interface IGetAllProjectsResponse extends IApiResponse {
    projects?: IProject[];
}

export interface IDeleteProjectResponse extends IApiResponse {
    deletedSessions?: number;
    deletedMessages?: number;
    deletedTasks?: number;
    deletedMemories?: number;
    deletedAttachments?: number;
}


/** ------------- function params ------------- */

export interface IDeleteProjectParams {
    projectDir: string;
    reclaimR2?: boolean;
}
