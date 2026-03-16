"use server";

import {apis} from "@/utils/apis";
import type {IGetImportUrlResponse} from "@/types/import";

async function getImportUrl(): Promise<IGetImportUrlResponse> {
    try {
        const url: string = apis.importProjectApi;

        return {
            success: true,
            url,
        };
    } catch (error: unknown) {
        console.error('Get import URL error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {getImportUrl};
