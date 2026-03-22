"use server";

import {cacheTag, updateTag} from "next/cache";
import {apis} from "@/utils/apis";
import {IMessage} from "@/types/message";
import {getActiveBranch} from "@/utils/getActiveBranch";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {IDeleteSessionParams, IDeleteSessionResponse, IGetAllSessionsParams, IGetAllSessionsResponse, IGetSessionParams, IGetSessionResponse, IPagination, ISession, IUpdateSessionParams, IUpdateSessionResponse} from "@/types/session";

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
        const url: string = `${apis.getAllSessionsApi}${queryString ? `?${queryString}` : ''}`;

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

        // console.log('getSession data:', JSON.stringify(data));

        const allMessages: IMessage[] = data.messages as IMessage[];
        const activeMessages: IMessage[] = getActiveBranch(allMessages);

        return {
            success: true,
            message: data.message,
            session: data.session as ISession,
            messages: allMessages,
        };
    } catch (error: unknown) {
        console.error('Get session error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function updateSession({sessionId, title, description}: IUpdateSessionParams): Promise<IUpdateSessionResponse> {
    try {
        const body: Record<string, string> = {};
        if (title !== undefined) body.title = title;
        if (description !== undefined) body.description = description;

        const response: Response = await fetch(apis.updateSessionApi(sessionId), {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to update session!';
            console.error('Updating session failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'INVALID_SESSIONID') {
                errorMessage = `Invalid sessionId: ${sessionId}!`;
            } else if (errorCode === 'INVALID_TITLE') {
                errorMessage = 'Title must be non-empty and at most 100 characters!';
            } else if (errorCode === 'INVALID_DESCRIPTION') {
                errorMessage = 'Description must be at most 500 characters!';
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
            session: data.session as ISession,
        };
    } catch (error: unknown) {
        console.error('Update session error:', error);
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

        // updateTag('sessions');
        // updateTag('projects');
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

export {getAllSessions, getSession, deleteSession, updateSession, refreshSidebar};
