"use server";

import {apis} from "@/utils/apis";
import {IMessage} from "@/types/message";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {IConversation, IGetAllConversationsParams, IGetAllConversationsResponse, IGetProjectsResponse, IGetSessionParams, IGetSessionResponse, IPagination} from "@/types/conversation";

async function getAllConversations(params: IGetAllConversationsParams = {}): Promise<IGetAllConversationsResponse> {
    try {
        const searchParams: URLSearchParams = new URLSearchParams();

        if (params.title) searchParams.set('title', params.title);
        if (params.source) searchParams.set('source', params.source);
        if (params.projectDir) searchParams.set('projectDir', params.projectDir);
        if (params.page) searchParams.set('page', String(params.page));
        if (params.limit) searchParams.set('limit', String(params.limit));

        const queryString: string = searchParams.toString();
        const url: string = `${apis.getAllConversationsApi}${queryString ? `?${queryString}` : ''}`;

        const response: Response = await fetch(url);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = 'Failed to fetch conversations!';
            console.error('Getting all conversations failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
                conversations: [],
                pagination: {page: 1, limit: 20, total: 0, totalPages: 0},
            };
        }

        return {
            success: true,
            message: data.message,
            conversations: data.conversations as IConversation[],
            pagination: data.pagination as IPagination,
        };
    } catch (error: unknown) {
        console.error('Get all conversations error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
            conversations: [],
            pagination: {page: 1, limit: 20, total: 0, totalPages: 0},
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
            conversation: data.conversation as IConversation,
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

export {getAllConversations, getSession, getProjects};
