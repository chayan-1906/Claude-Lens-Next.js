"use server";

import {apis} from "@/utils/apis";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import {IReclaimR2StorageParams, IReclaimR2StorageResponse} from "@/types/r2";

async function reclaimR2Storage({sessionId, projectDir}: IReclaimR2StorageParams): Promise<IReclaimR2StorageResponse> {
    try {
        const body: Partial<IReclaimR2StorageParams> = {};
        if (sessionId) body.sessionId = sessionId;
        if (projectDir) body.projectDir = projectDir;

        const response: Response = await fetch(apis.reclaimR2Api, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(body),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorMessage: string = data.error?.message || 'Failed to reclaim R2 storage!';
            console.error('Reclaiming R2 storage failed:', {message: errorMessage});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            deletedAttachments: data.deletedAttachments as number,
        };
    } catch (error: unknown) {
        console.error('Reclaim R2 storage error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {reclaimR2Storage};
