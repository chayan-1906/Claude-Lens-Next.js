"use server";

import {apis} from "@/utils/apis";
import type {ITranscribeResult} from "@/types/voice";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";

async function transcribeAudio(formData: FormData): Promise<ITranscribeResult> {
    try {
        const response: Response = await fetch(apis.transcribeApi, {
            method: 'POST',
            body: formData,
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorMessage: string = (data.error?.message as string) || 'Transcription failed. Please try again!';
            console.error('Transcription failed:', {code: data.error?.code, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            transcript: data.transcript as string,
            rephrased: data.rephrased as string,
        };
    } catch (error: unknown) {
        console.error('Transcribe audio error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

export {transcribeAudio};
