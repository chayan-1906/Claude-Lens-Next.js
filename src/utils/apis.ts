import {BACKEND_URL} from "../../config/config";

/** Base URL for all API endpoints */
const baseApiUrl: string = `${BACKEND_URL}/api/v1`;

/** Base URL for session endpoints */
const baseSessionApiUrl: string = `${baseApiUrl}/sessions`;

/** Backend API endpoint URLs */
const apis = {
    getAllSessionssApi: baseSessionApiUrl,
    getSessionApi: (sessionId: string) => `${baseSessionApiUrl}/${sessionId}`,
    getProjectsApi: `${baseSessionApiUrl}/projects`,
};

export {apis};
