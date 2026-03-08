import type {IApiResponse} from "@/types/session";

/** ------------- Constants and Type Aliases ------------- */

export const SETUP_CONFIGURED_COOKIE: string = 'claude-lens-configured';


/** ------------- API response types ------------- */

export interface IGetSetupStatusResponse extends IApiResponse {
    configured?: boolean;
    hasLocalConfig?: boolean;
}

export interface ISetupResponse extends IApiResponse {
}


/** ------------- function params ------------- */

export interface ISetupParams {
    mongoUri: string;
}
