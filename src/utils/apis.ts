import {BACKEND_URL} from "../../config/config";

/** Base URL for all API endpoints */
const baseApiUrl: string = `${BACKEND_URL}/api/v1`;

/** Base URL for session endpoints */
const baseSyncApiUrl: string = `${baseApiUrl}/sync`;

/** Base URL for session endpoints */
const baseSessionApiUrl: string = `${baseApiUrl}/sessions`;

/** Base URL for task endpoints */
const baseTaskApiUrl: string = `${baseApiUrl}/tasks`;

/** Base URL for memory endpoints */
const baseMemoryApiUrl: string = `${baseApiUrl}/memories`;

/** Backend API endpoint URLs */
const apis = {
    getLocalProjectsApi: `${baseSyncApiUrl}/projects`,
    syncApi: baseSyncApiUrl,

    getAllSessionssApi: baseSessionApiUrl,
    getSessionApi: (sessionId: string) => `${baseSessionApiUrl}/${sessionId}`,
    getAllProjectsApi: `${baseSessionApiUrl}/projects`,
    deleteSessionApi: (sessionId: string) => `${baseSessionApiUrl}/${sessionId}`,
    deleteProjectApi: (projectDir: string) => `${baseSessionApiUrl}/projects/${encodeURIComponent(projectDir)}`,

    getAllTasksApi: baseTaskApiUrl,
    getTaskApi: (sessionId: string, taskId: string) => `${baseTaskApiUrl}/${sessionId}/${taskId}`,
    deleteTasksApi: (sessionId: string) => `${baseTaskApiUrl}/${sessionId}`,

    getAllMemoriesApi: baseMemoryApiUrl,
    getMemory: (projectDir: string) => `${baseMemoryApiUrl}/${projectDir}`,
    deleteMemoryApi: (projectDir: string) => `${baseMemoryApiUrl}/${encodeURIComponent(projectDir)}`,
};

export {apis};
