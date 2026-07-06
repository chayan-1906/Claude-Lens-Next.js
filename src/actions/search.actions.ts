"use server";

import {apis} from "@/utils/apis";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {ISearchMemoryResponse, ISearchMessageResponse, ISearchQuery, ISearchResponse, ISearchSessionResponse, ISearchTaskResponse} from "@/types/search";

async function search(params: ISearchQuery): Promise<ISearchResponse> {
    try {
        const url: string = apis.searchApi(params);
        const response: Response = await fetch(url);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            console.error('Search failed:', {code: errorCode, message: data.error?.message});
            return {
                success: false,
                error: data.error?.message || 'Search failed!',
            };
        }

        const results = data.results as {
            messages?: ISearchMessageResponse[];
            sessions?: ISearchSessionResponse[];
            tasks?: ISearchTaskResponse[];
            memories?: ISearchMemoryResponse[];
            totalCount?: number;
        } | undefined;

        return {
            success: true,
            message: data.message,
            messages: results?.messages,
            sessions: results?.sessions,
            tasks: results?.tasks,
            memories: results?.memories,
            totalCount: results?.totalCount,
        };
    } catch (error: unknown) {
        console.error('Search error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {search};
