import {IApiResponse} from "@/types/session";

/** ------------- Constants and Type Aliases ------------- */



/** ------------- API response types ------------- */

export interface IGetExportUrlResponse extends IApiResponse {
    url?: string;
}


/** ------------- function params ------------- */

export interface IGetExportUrlParams {
    projectDir: string;
    sessionId?: string;
}
