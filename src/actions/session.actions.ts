"use server";

import {cacheTag, updateTag} from "next/cache";
import {apis} from "@/utils/apis";
import {IMessage} from "@/types/message";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {IDeleteSessionParams, IDeleteSessionResponse, IGetAllSessionsParams, IGetAllSessionsResponse, IGetSessionParams, IGetSessionResponse, IPagination, ISession} from "@/types/session";

async function getAllSessions(params: IGetAllSessionsParams = {}): Promise<IGetAllSessionsResponse> {
    "use cache";
    cacheTag('sessions');

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
    // "use cache";
    // cacheTag('sessions');

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

async function deleteSession({sessionId}: IDeleteSessionParams): Promise<IDeleteSessionResponse> {
    try {
        const response: Response = await fetch(apis.deleteSessionApi(sessionId), {
            method: 'DELETE',
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to delete session!';
            console.error('Deleting session failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'INVALID_SESSIONID') {
                errorMessage = `Invalid sessionId: ${sessionId}!`;
            } else if (errorCode === 'SESSION_NOT_FOUND') {
                errorMessage = `No session found with sessionId: ${sessionId}!`;
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        updateTag('sessions');
        return {
            success: true,
            message: data.message,
            deletedSessions: data.deletedSessions as number,
            deletedMessages: data.deletedMessages as number,
            deletedTasks: data.deletedTasks as number,
        };
    } catch (error: unknown) {
        console.error('Delete session error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function refreshSidebar(): Promise<void> {
    updateTag('projects');
    updateTag('sessions');
    updateTag('tasks');
    updateTag('memories');
}

export {getAllSessions, getSession, deleteSession, refreshSidebar};
