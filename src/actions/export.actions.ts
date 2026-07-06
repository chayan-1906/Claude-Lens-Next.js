"use server";

import {apis} from "@/utils/apis";
import {IGetExportUrlParams, IGetExportUrlResponse} from "@/types/export";

async function getExportUrl({projectDir, sessionId}: IGetExportUrlParams): Promise<IGetExportUrlResponse> {
    try {
        if (!projectDir) {
            return {
                success: false,
                error: 'projectDir is required!',
            };
        }

        const url: string = apis.exportProjectApi(projectDir, sessionId);

        return {
            success: true,
            url,
        };
    } catch (error: unknown) {
        console.error('Get export URL error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {getExportUrl};
