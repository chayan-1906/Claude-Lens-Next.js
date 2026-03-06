import {IApiResponse} from "@/types/session";

/** ------------- Constants and Type Aliases ------------- */

export type SyncTarget = 'sessions' | 'tasks' | 'memories';

export const ALL_SYNC_TARGETS: SyncTarget[] = ['sessions', 'tasks', 'memories'];


/** ------------- API response types ------------- */

export interface IGetLocalProjectsResponse extends IApiResponse {
    projects?: string[];
}

export interface ISyncResponse extends IApiResponse {
    sessions?: {
        synced: number;
        newMessages: number;
        skipped: number;
        errors: number;
    };
    tasks?: {
        synced: number;
        updated: number;
    };
    memories?: {
        synced: number;
        updated: number;
    };
}


/** ------------- function params ------------- */

export interface ISyncParams {
    projectDirs: string[];
    targets?: SyncTarget[];
}
