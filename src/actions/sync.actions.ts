"use server";

import {updateTag} from "next/cache";
import {apis} from "@/utils/apis";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {ALL_SYNC_TARGETS, IGetLocalProjectsResponse, ISyncParams, ISyncResponse} from "@/types/sync";

async function getLocalProjects(): Promise<IGetLocalProjectsResponse> {
    try {
        const response: Response = await fetch(apis.getLocalProjectsApi);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = 'Failed to fetch local projects!';
            console.error('Getting local projects failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            projects: data.projects as string[],
        };
    } catch (error: unknown) {
        console.error('Get local projects error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function syncData({projectDirs, targets}: ISyncParams): Promise<ISyncResponse> {
    try {
        const response: Response = await fetch(apis.syncApi, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({projectDirs, targets}),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to sync data!';
            console.error('Sync failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'INVALID_TARGETS') {
                errorMessage = `targets must be one of: ${ALL_SYNC_TARGETS.join(', ')}`;
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        updateTag('sessions');
        updateTag('tasks');
        updateTag('memories');
        updateTag('projects');

        const result: ISyncResponse = {
            success: true,
            message: data.message,
        };

        if (data.sessions) result.sessions = data.sessions as ISyncResponse['sessions'];
        if (data.tasks) result.tasks = data.tasks as ISyncResponse['tasks'];
        if (data.memories) result.memories = data.memories as ISyncResponse['memories'];

        return result;
    } catch (error: unknown) {
        console.error('Sync error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {getLocalProjects, syncData};
