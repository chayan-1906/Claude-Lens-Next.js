"use server";

import {apis} from "@/utils/apis";
import {IMessage} from "@/types/message";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {IGetAllSessionsParams, IGetAllSessionsResponse, IGetProjectsResponse, IGetSessionParams, IGetSessionResponse, IPagination, ISession} from "@/types/session";

async function getAllSessions(params: IGetAllSessionsParams = {}): Promise<IGetAllSessionsResponse> {
    try {
        const searchParams: URLSearchParams = new URLSearchParams();

        if (params.title) searchParams.set('title', params.title);
        if (params.source) searchParams.set('source', params.source);
        if (params.projectDir) searchParams.set('projectDir', params.projectDir);
        if (params.page) searchParams.set('page', String(params.page));
        if (params.limit) searchParams.set('limit', String(params.limit));

        const queryString: string = searchParams.toString();
        const url: string = `${apis.getAllSessionssApi}${queryString ? `?${queryString}` : ''}`;

        const response: Response = await fetch(url);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = 'Failed to fetch sessions!';
            console.error('Getting all sessions failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            sessions: data.sessions as ISession[],
            pagination: data.pagination as IPagination,
        };
    } catch (error: unknown) {
        console.error('Get all sessions error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function getSession({sessionId}: IGetSessionParams): Promise<IGetSessionResponse> {
    try {
        const response: Response = await fetch(apis.getSessionApi(sessionId));
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to fetch session!';
            console.error('Getting session failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'INVALID_SESSIONID') {
                errorMessage = `Invalid sessionId: ${sessionId}`;
            } else if (errorCode === 'SESSION_NOT_FOUND') {
                errorMessage = `No session found with sessionId: ${sessionId}`;
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            session: data.session as ISession,
            messages: data.messages as IMessage[],
        };
    } catch (error: unknown) {
        console.error('Get session error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function getProjects(): Promise<IGetProjectsResponse> {
    try {
        const response: Response = await fetch(apis.getProjectsApi);
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
            projects: data.projects as string[],
        };
    } catch (error: unknown) {
        console.error('Get projects error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {getAllSessions, getSession, getProjects};
