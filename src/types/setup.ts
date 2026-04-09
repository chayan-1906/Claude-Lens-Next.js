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

/** Cloudflare R2 storage credentials for attachment uploads */
export interface IR2Config {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    publicUrl: string;
    bucketName: string;
}

/** A single path mapping — maps multiple absolute paths to one canonical path */
export interface IPathMapping {
    id: string;
    label: string;
    paths: string[];
    canonicalPath: string;
}

/** A detected Claude account from a ~/.claude-.../ directory */
export interface IClaudeAccount {
    configDir: string;
    email: string | null;
    label: string;
    isLoggedIn: boolean;
}


/** ------------- API response types ------------- */

export interface IGetSetupStatusResponse extends IApiResponse {
    configured?: boolean;
    hasLocalConfig?: boolean;
    r2Configured?: boolean;
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

export interface IGetPathMappingsResponse extends IApiResponse {
    pathMappings?: IPathMapping[];
}

export interface ICreatePathMappingResponse extends IApiResponse {
    pathMapping?: IPathMapping;
}

export interface IUpdatePathMappingResponse extends IApiResponse {
    pathMapping?: IPathMapping;
}

export type IDeletePathMappingResponse = IApiResponse;

export interface IMergePathMappingResponse extends IApiResponse {
    sessionsUpdated?: number;
    memoriesUpdated?: number;
}

export interface IGetR2ConfigResponse extends IApiResponse {
    r2Config?: IR2Config | null;
}

export interface ISaveR2ConfigResponse extends IApiResponse {
    r2Config?: IR2Config;
}

export interface IGetAccountsResponse extends IApiResponse {
    accounts?: IClaudeAccount[];
}

export interface IGetClaudeAccountResponse extends IApiResponse {
    claudeConfigDir?: string | null;
}

export type ISaveClaudeAccountResponse = IApiResponse;


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

export interface ICreatePathMappingParams {
    label: string;
    paths: string[];
    canonicalPath: string;
}

export interface IUpdatePathMappingParams {
    mappingId: string;
    label?: string;
    paths?: string[];
    canonicalPath?: string;
}

export interface IDeletePathMappingParams {
    mappingId: string;
}

export interface IMergePathMappingParams {
    mappingId: string;
}

export interface ISaveR2ConfigParams {
    accessKeyId: string;
    secretAccessKey: string;
    endpoint: string;
    publicUrl: string;
    bucketName: string;
}

export interface ISaveClaudeAccountParams {
    claudeConfigDir: string;
}
