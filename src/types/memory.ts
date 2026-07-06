import type {IApiResponse, IPagination} from "./session";

/** ------------- Constants and Type Aliases ------------- */

export interface IMemory {
    memoryId: string;
    projectDir: string;
    filePath: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}


/** ------------- API response types ------------- */

export interface IGetAllMemoriesResponse extends IApiResponse {
    memories?: IMemory[];
    pagination?: IPagination;
}

export interface IGetMemoryResponse extends IApiResponse {
    memories?: IMemory[];
}

export interface IDeleteMemoryResponse extends IApiResponse {
    deletedMemories?: number;
}


/** ------------- Memory file parsing ------------- */

export interface IFrontmatter {
    name?: string;
    description?: string;
    type?: string;
    originSessionId?: string;
}

export interface IParsedMemory {
    frontmatter: IFrontmatter;
    body: string;
}


/** ------------- function params ------------- */

export interface IGetAllMemoriesParams {
    projectDir?: string;
    page?: number;
    limit?: number;
}

export interface IGetMemoryParams {
    projectDir: string;
}

export interface IDeleteMemoryParams {
    projectDir: string;
}
