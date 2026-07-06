"use server";

import {cacheTag, updateTag} from "next/cache";
import {apis} from "@/utils/apis";
import {IPagination} from "@/types/session";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {IDeleteMemoryParams, IDeleteMemoryResponse, IGetAllMemoriesParams, IGetAllMemoriesResponse, IGetMemoryParams, IGetMemoryResponse, IMemory} from "@/types/memory";

async function getAllMemories(params: IGetAllMemoriesParams = {}): Promise<IGetAllMemoriesResponse> {
    "use cache";
    cacheTag('memories');

    try {
        const searchParams: URLSearchParams = new URLSearchParams();

        if (params.projectDir) searchParams.set('projectDir', params.projectDir);
        if (params.page) searchParams.set('page', String(params.page));
        if (params.limit) searchParams.set('limit', String(params.limit));

        const queryString: string = searchParams.toString();
        const url: string = `${apis.getAllMemoriesApi}${queryString ? `?${queryString}` : ''}`;

        const response: Response = await fetch(url);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = 'Failed to fetch memories!';
            console.error('Getting all memories failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            memories: data.memories as IMemory[],
            pagination: data.pagination as IPagination,
        };
    } catch (error: unknown) {
        console.error('Get all memories error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function getMemories({projectDir}: IGetMemoryParams): Promise<IGetMemoryResponse> {
    "use cache";
    cacheTag('memories');

    try {
        const response: Response = await fetch(apis.getMemory(projectDir));
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to fetch memories!';
            console.error('Getting memories failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'INVALID_PROJECTDIR') {
                errorMessage = `Invalid projectDir: ${projectDir}!`;
            } else if (errorCode === 'MEMORIES_NOT_FOUND') {
                errorMessage = `No memories found for project: ${projectDir}!`;
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            memories: data.memories as IMemory[],
        };
    } catch (error: unknown) {
        console.error('Get memories error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function deleteMemory({projectDir}: IDeleteMemoryParams): Promise<IDeleteMemoryResponse> {
    try {
        const response: Response = await fetch(apis.deleteMemoryApi(projectDir), {
            method: 'DELETE',
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to delete memory!';
            console.error('Deleting memory failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'PROJECTDIR_MISSING') {
                errorMessage = `projectDir is required!`;
            } else if (errorCode === 'MEMORIES_NOT_FOUND') {
                errorMessage = `No memories found for project: ${projectDir}!`;
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        updateTag('projects');
        return {
            success: true,
            message: data.message,
            deletedMemories: data.deletedMemories as number,
        };
    } catch (error: unknown) {
        console.error('Delete memory error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {getAllMemories, getMemories, deleteMemory};
