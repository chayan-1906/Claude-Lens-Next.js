"use server";

import {apis} from "@/utils/apis";
import {IGetSessionPdfUrlParams, IGetSessionPdfUrlResponse} from "@/types/pdf";

async function getSessionPdfUrl({sessionId, includeThinking, includeTools}: IGetSessionPdfUrlParams): Promise<IGetSessionPdfUrlResponse> {
    try {
        if (!sessionId) {
            return {
                success: false,
                error: 'sessionId is required!',
            };
        }

        const url: string = apis.sessionPdfApi(sessionId, {includeThinking, includeTools});

        return {
            success: true,
            url,
        };
    } catch (error: unknown) {
        console.error('Get session PDF URL error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {getSessionPdfUrl};
