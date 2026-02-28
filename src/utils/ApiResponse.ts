/** Constructor params for ApiResponseClass */
type TApiResponseParams = {
    success?: boolean;
    message?: string | null;
    errorCode?: string | number | null;
    errorMsg?: string | null;
    debugError?: unknown;
    [key: string]: unknown;
}

/**
 * Standardized API response wrapper
 * Handles success/error states with consistent structure
 * Supports additional dynamic properties via rest params
 */
export class ApiResponseClass {
    success: boolean;
    message?: string;
    error?: { code?: string | number; message?: string };
    debugError?: unknown;

    [key: string]: unknown;

    constructor({success = false, message = null, errorCode = 'INTERNAL_SERVER_ERROR', errorMsg = null, debugError = null, ...rest}: TApiResponseParams) {
        this.success = success;

        if (success && message !== null) this.message = message;
        if (!success) {
            const error: { code?: string | number; message?: string } = {};
            if (errorCode !== null) error.code = errorCode;
            if (errorMsg !== null) error.message = errorMsg;
            if (Object.keys(error).length) this.error = error;
            if (debugError !== null) this.debugError = debugError;
        }

        for (const [key, value] of Object.entries(rest)) {
            if (value !== null) this[key] = value;
        }
    }
}

/** Type alias for ApiResponseClass */
export type TApiResponse = ApiResponseClass;

/** Parse fetch Response JSON into ApiResponseClass */
export async function parseApiResponse(response: Response): Promise<ApiResponseClass> {
    const data = await response.json();
    return new ApiResponseClass(data);
}
