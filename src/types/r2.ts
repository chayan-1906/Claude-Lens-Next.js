import {IApiResponse} from "@/types/session";

/** ------------- Constants and Type Aliases ------------- */



/** ------------- API response types ------------- */

export interface IReclaimR2StorageResponse extends IApiResponse {
    deletedAttachments?: number;
}


/** ------------- function params ------------- */

export interface IReclaimR2StorageParams {
    sessionId?: string;
    projectDir?: string;
}
