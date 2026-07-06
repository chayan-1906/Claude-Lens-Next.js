"use server";

import {apis} from "@/utils/apis";
import {IStubToolResultsResponse} from "@/types/message";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";

async function stubToolResults(sessionId: string, messageIds: string[]): Promise<IStubToolResultsResponse> {
    try {
        const response: Response = await fetch(apis.stubToolResultsApi(sessionId), {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({messageIds}),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorMessage: string = data.error?.message || 'Failed to stub tool result!';
            console.error('Stubbing tool result failed:', {code: data.error?.code, message: data.error?.message});
            return {success: false, error: errorMessage};
        }

        return {
            success: true,
            stubbedCount: data.stubbedCount as number,
            diskUpdated: data.diskUpdated as boolean,
        };
    } catch (error: unknown) {
        console.error('Stub tool result error:', error);
        return {success: false, error: 'Something went wrong. Please try again!'};
    }
}

export {stubToolResults};
