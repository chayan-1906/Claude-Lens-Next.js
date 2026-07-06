"use server";

import {apis} from "@/utils/apis";
import type {ITranscribeResult} from "@/types/voice";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import type {IGetTtsSettingsResponse, ISaveTtsSettingsParams, ISaveTtsSettingsResponse} from "@/types/tts";

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

async function getTtsSettings(): Promise<IGetTtsSettingsResponse> {
    try {
        const response: Response = await fetch(apis.getTtsSettingsApi);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            console.error('Getting TTS settings failed:', {code: data.error?.code, message: data.error?.message});
            return {success: false, error: 'Failed to fetch TTS settings!'};
        }

        return {
            success: true,
            voiceId: data.voiceId as string,
            rate: data.rate as number,
        };
    } catch (error: unknown) {
        console.error('Get TTS settings error:', error);
        return {success: false, error: 'Something went wrong. Please try again!'};
    }
}

async function saveTtsSettings({voiceId, rate}: ISaveTtsSettingsParams): Promise<ISaveTtsSettingsResponse> {
    try {
        const response: Response = await fetch(apis.saveTtsSettingsApi, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({voiceId, rate}),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            console.error('Saving TTS settings failed:', {code: data.error?.code, message: data.error?.message});
            return {success: false, error: 'Failed to save TTS settings!'};
        }

        return {success: true};
    } catch (error: unknown) {
        console.error('Save TTS settings error:', error);
        return {success: false, error: 'Something went wrong. Please try again!'};
    }
}

export {transcribeAudio, getTtsSettings, saveTtsSettings};
