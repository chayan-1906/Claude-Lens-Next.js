import type {IApiResponse} from "@/types/session";

/** ------------- Constants and Type Aliases ------------- */

export const SETUP_CONFIGURED_COOKIE: string = 'claude-lens-configured';

/** A single saved MongoDB configuration */
export interface IMongoConfig {
    id: string;
    name: string;
    uri: string;
    description?: string;
    color: string;
    lastConnectedAt?: string;
}


/** ------------- API response types ------------- */

export interface IGetSetupStatusResponse extends IApiResponse {
    configured?: boolean;
    hasLocalConfig?: boolean;
}

export interface IGetConfigurationsResponse extends IApiResponse {
    configurations?: IMongoConfig[];
    activeConfigId?: string;
}

export interface IAddConfigurationResponse extends IApiResponse {
    configuration?: IMongoConfig;
}

export interface IEditConfigurationResponse extends IApiResponse {
    configuration?: IMongoConfig;
}

export type IDeleteConfigurationResponse = IApiResponse;

export type ITestConfigurationResponse = IApiResponse;

export type IActivateConfigurationResponse = IApiResponse;

export interface IGetConfigProjectsResponse extends IApiResponse {
    projects?: { rawProjectDir: string; projectDir: string }[];
}


/** ------------- function params ------------- */

export interface IAddConfigurationParams {
    name: string;
    uri: string;
    description?: string;
    color?: string;
}

export interface IEditConfigurationParams {
    configId: string;
    name?: string;
    uri?: string;
    description?: string;
    color?: string;
}

export interface IDeleteConfigurationParams {
    configId: string;
}

export interface ITestConfigurationParams {
    configId: string;
}

export interface IActivateConfigurationParams {
    configId: string;
}

export interface IGetConfigProjectsParams {
    configId: string;
}
