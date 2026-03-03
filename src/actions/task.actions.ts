"use server";

import {apis} from "@/utils/apis";
import {IPagination} from "@/types/session";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {IGetAllTasksParams, IGetAllTasksResponse, IGetTaskParams, IGetTaskResponse, ITask} from "@/types/task";

async function getAllTasks(params: IGetAllTasksParams = {}): Promise<IGetAllTasksResponse> {
    try {
        const searchParams: URLSearchParams = new URLSearchParams();

        if (params.sessionId) searchParams.set('sessionId', params.sessionId);
        if (params.page) searchParams.set('page', String(params.page));
        if (params.limit) searchParams.set('limit', String(params.limit));

        const queryString: string = searchParams.toString();
        const url: string = `${apis.getAllTasksApi}${queryString ? `?${queryString}` : ''}`;

        const response: Response = await fetch(url);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = 'Failed to fetch tasks!';
            console.error('Getting all tasks failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            tasks: data.tasks as ITask[],
            pagination: data.pagination as IPagination,
        };
    } catch (error: unknown) {
        console.error('Get all tasks error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function getTask({sessionId, taskId}: IGetTaskParams): Promise<IGetTaskResponse> {
    try {
        const response: Response = await fetch(apis.getTaskApi(sessionId, taskId));
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to fetch task!';
            console.error('Getting task failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'INVALID_SESSIONID') {
                errorMessage = `Invalid sessionId: ${sessionId}`;
            } else if (errorCode === 'INVALID_TASKID') {
                errorMessage = `Invalid taskId: ${taskId}`;
            } else if (errorCode === 'TASK_NOT_FOUND') {
                errorMessage = `No task found with taskId: ${taskId}`;
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            task: data.task as ITask,
        };
    } catch (error: unknown) {
        console.error('Get task error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {getAllTasks, getTask};
