"use server";

import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {apis} from "@/utils/apis";
import {routes} from "@/utils/routes";
import {SETUP_CONFIGURED_COOKIE} from "@/types/setup";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import type {IGetSetupStatusResponse, ISetupParams, ISetupResponse} from "@/types/setup";

async function getSetupStatus(): Promise<IGetSetupStatusResponse> {
    try {
        const response: Response = await fetch(apis.getSetupStatusApi);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = 'Failed to fetch setup status!';
            console.error('Getting setup status failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            configured: data.configured as boolean,
            hasLocalConfig: data.hasLocalConfig as boolean,
        };
    } catch (error: unknown) {
        console.error('Get setup status error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function setup({mongoUri}: ISetupParams): Promise<ISetupResponse> {
    try {
        const response: Response = await fetch(apis.setupApi, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({mongoUri}),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to setup MongoDB connection!';
            console.error('Setup failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'MONGO_URI_MISSING') {
                errorMessage = 'MongoDB URI is required!';
            } else if (errorCode === 'INVALID_MONGO_URI') {
                errorMessage = data.error?.message || 'Invalid MongoDB URI. Please check and try again!';
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        await setSetupConfiguredCookie();
    } catch (error: unknown) {
        console.error('Setup error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }

    redirect(routes.homePath);
}

async function setSetupConfiguredCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SETUP_CONFIGURED_COOKIE, 'true', {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
        httpOnly: true,
    });
}

export {getSetupStatus, setup, setSetupConfiguredCookie};
