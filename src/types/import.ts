import {IApiResponse} from "@/types/session";

/** ------------- Constants and Type Aliases ------------- */

/** Shape of manifest.json inside a Claude Lens export ZIP */
export interface IImportManifest {
    exportedAt: string;
    claudeLensVersion: string;
    projectDir: string;
    claudeNativeFolderName: string;
    totalSessions: number;
    totalMemoryFiles: number;
    totalTasks: number;
    sessions: IImportManifestSessionEntry[];
}

/** Shape of a single session entry inside manifest.json */
export interface IImportManifestSessionEntry {
    sessionId: string;
    title: string;
    aiModel?: string;
    gitBranch?: string;
    file: string;
}


/** ------------- API response types ------------- */

export interface IImportProjectResponse extends IApiResponse {
    totalSessions?: number;
    totalMessages?: number;
    totalMemoryFiles?: number;
    totalTasks?: number;
}

export interface IGetImportUrlResponse extends IApiResponse {
    url?: string;
}


/** ------------- function params ------------- */

export interface IGetImportUrlParams {
    remappedProjectDir?: string;
}
