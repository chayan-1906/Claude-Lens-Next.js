import {BACKEND_URL} from "../../config/config";

/** Base URL for all API endpoints */
const baseApiUrl: string = `${BACKEND_URL}/api/v1`;

/** Base URL for session endpoints */
const baseSessionApiUrl: string = `${baseApiUrl}/sessions`;

/** Base URL for task endpoints */
const baseTaskApiUrl: string = `${baseApiUrl}/tasks`;

/** Base URL for memory endpoints */
const baseMemoryApiUrl: string = `${baseApiUrl}/memories`;

/** Backend API endpoint URLs */
const apis = {
    getAllSessionssApi: baseSessionApiUrl,
    getSessionApi: (sessionId: string) => `${baseSessionApiUrl}/${sessionId}`,
    getAllProjectsApi: `${baseSessionApiUrl}/projects`,
    
    getAllTasksApi: baseTaskApiUrl,
    getTaskApi: (sessionId: string, taskId: string) => `${baseTaskApiUrl}/${sessionId}/${taskId}`,
    
    getAllMemoriesApi: baseMemoryApiUrl,
    getMemory: (projectDir: string)=> `${baseMemoryApiUrl}/${projectDir}`,
};

export {apis};
