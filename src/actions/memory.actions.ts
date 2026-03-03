"use server";

import {apis} from "@/utils/apis";
import {IPagination} from "@/types/session";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {IGetAllMemoriesParams, IGetAllMemoriesResponse, IGetMemoryParams, IGetMemoryResponse, IMemory} from "@/types/memory";

async function getAllMemories(params: IGetAllMemoriesParams = {}): Promise<IGetAllMemoriesResponse> {
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

async function getMemory({projectDir}: IGetMemoryParams): Promise<IGetMemoryResponse> {
    try {
        const response: Response = await fetch(apis.getMemory(projectDir));
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to fetch memory!';
            console.error('Getting memory failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'INVALID_PROJECTDIR') {
                errorMessage = `Invalid projectDir: ${projectDir}!`;
            } else if (errorCode === 'MEMORY_NOT_FOUND') {
                errorMessage = `No memory found for project: ${projectDir}!`;
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            memory: data.memory as IMemory,
        };
    } catch (error: unknown) {
        console.error('Get memory error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {getAllMemories, getMemory};
