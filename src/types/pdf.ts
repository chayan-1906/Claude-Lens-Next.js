import {IApiResponse} from "@/types/session";

/** ------------- API response types ------------- */

export interface IGetSessionPdfUrlResponse extends IApiResponse {
    url?: string;
}


/** ------------- function params ------------- */

export interface IGetSessionPdfUrlParams {
    sessionId: string;
    includeThinking?: boolean;
    includeTools?: boolean;
}
