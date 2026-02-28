import {BACKEND_URL} from "../../config/config";

/** Base URL for all API endpoints */
const baseApiUrl: string = `${BACKEND_URL}/api/v1`;

/** Base URL for conversation endpoints */
const baseConversationApiUrl: string = `${baseApiUrl}/conversations`;

/** Backend API endpoint URLs */
const apis = {
    getAllConversationsApi: baseConversationApiUrl,
    getSessionApi: (sessionId: string) => `${baseConversationApiUrl}/sessions/${sessionId}`,
    getProjectsApi: `${baseConversationApiUrl}/projects`,
};

export {apis};
