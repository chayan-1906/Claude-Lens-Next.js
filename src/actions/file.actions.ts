"use server";

import {apis} from "@/utils/apis";
import {IOpenFolderPickerResponse} from "@/types/file";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";

async function openFolderPicker(): Promise<IOpenFolderPickerResponse> {
    try {
        const response: Response = await fetch(apis.openFolderPickerApi);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            return {
                success: false,
                error: (data.error?.message as string) || 'User cancelled folder selection!',
            };
        }

        return {
            success: true,
            path: data.path as string,
        };
    } catch (error: unknown) {
        console.error('openFolderPicker error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {openFolderPicker};
