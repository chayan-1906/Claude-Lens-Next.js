"use server";

import {cacheTag, updateTag} from "next/cache";
import {apis} from "@/utils/apis";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {IDeleteProjectParams, IDeleteProjectResponse, IGetAllProjectsResponse, IProject} from "@/types/project";

async function getAllProjects(): Promise<IGetAllProjectsResponse> {
    "use cache";
    cacheTag('projects');

    try {
        const response: Response = await fetch(apis.getAllProjectsApi);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = 'Failed to fetch projects!';
            console.error('Getting projects failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            projects: data.projects as IProject[],
        };
    } catch (error: unknown) {
        console.error('Get projects error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function deleteProject({projectDir, reclaimR2}: IDeleteProjectParams): Promise<IDeleteProjectResponse> {
    try {
        const response: Response = await fetch(apis.deleteProjectApi(projectDir), {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({reclaimR2: reclaimR2 ?? false}),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to delete project!';
            console.error('Deleting project failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'PROJECTDIR_MISSING') {
                errorMessage = 'projectDir is required!';
            } else if (errorCode === 'PROJECT_NOT_FOUND') {
                errorMessage = `No data found for project: ${projectDir}!`;
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
            deletedSessions: data.deletedSessions as number,
            deletedMessages: data.deletedMessages as number,
            deletedTasks: data.deletedTasks as number,
            deletedMemories: data.deletedMemories as number,
        };
    } catch (error: unknown) {
        console.error('Delete project error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {getAllProjects, deleteProject};
