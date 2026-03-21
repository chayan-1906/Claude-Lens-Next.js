import {BACKEND_URL} from "../../config/config";

/** Base URL for all API endpoints */
const baseApiUrl: string = `${BACKEND_URL}/api/v1`;

/** Base URL for setup endpoints */
const baseSetupApiUrl: string = `${baseApiUrl}/setup`;

/** Base URL for configuration endpoints */
const baseConfigurationsApiUrl: string = `${baseSetupApiUrl}/configurations`;

/** Base URL for sync endpoints */
const baseSyncApiUrl: string = `${baseApiUrl}/sync`;

/** Base URL for project endpoints */
const baseProjectApiUrl: string = `${baseApiUrl}/projects`;

/** Base URL for session endpoints */
const baseSessionApiUrl: string = `${baseApiUrl}/sessions`;

/** Base URL for task endpoints */
const baseTaskApiUrl: string = `${baseApiUrl}/tasks`;

/** Base URL for memory endpoints */
const baseMemoryApiUrl: string = `${baseApiUrl}/memories`;

/** Base URL for export endpoints */
const baseExportApiUrl: string = `${baseApiUrl}/export`;

/** Base URL for import endpoints */
const baseImportApiUrl: string = `${baseApiUrl}/import`;

/** Base URL for voice endpoints */
const baseVoiceApiUrl: string = `${baseApiUrl}/voice`;

/** Base URL for file-picker endpoints */
const baseFilePickerApiUrl: string = `${baseApiUrl}/file-picker`;

/** Backend API endpoint URLs */
const apis = {
    getSetupStatusApi: `${baseSetupApiUrl}/status`,

    getConfigurationsApi: baseConfigurationsApiUrl,
    addConfigurationApi: baseConfigurationsApiUrl,
    editConfigurationApi: (configId: string) => `${baseConfigurationsApiUrl}/${configId}`,
    deleteConfigurationApi: (configId: string) => `${baseConfigurationsApiUrl}/${configId}`,
    testConfigurationApi: (configId: string) => `${baseConfigurationsApiUrl}/${configId}/test`,
    activateConfigurationApi: (configId: string) => `${baseConfigurationsApiUrl}/${configId}/activate`,
    getConfigProjectsApi: (configId: string) => `${baseConfigurationsApiUrl}/${configId}/projects`,

    getLocalProjectsApi: `${baseSyncApiUrl}/projects`,
    syncApi: baseSyncApiUrl,

    getAllProjectsApi: baseProjectApiUrl,
    deleteProjectApi: (projectDir: string) => `${baseProjectApiUrl}/${encodeURIComponent(projectDir)}`,

    getAllSessionsApi: baseSessionApiUrl,
    getSessionApi: (sessionId: string) => `${baseSessionApiUrl}/${sessionId}`,
    deleteSessionApi: (sessionId: string) => `${baseSessionApiUrl}/${sessionId}`,
    stubToolResultsApi: (sessionId: string) => `${baseSessionApiUrl}/${sessionId}/messages/stub`,

    getAllTasksApi: baseTaskApiUrl,
    getTaskApi: (sessionId: string, taskId: string) => `${baseTaskApiUrl}/${sessionId}/${taskId}`,
    deleteTasksApi: (sessionId: string) => `${baseTaskApiUrl}/${sessionId}`,

    getAllMemoriesApi: baseMemoryApiUrl,
    getMemory: (projectDir: string) => `${baseMemoryApiUrl}/${encodeURIComponent(projectDir)}`,
    deleteMemoryApi: (projectDir: string) => `${baseMemoryApiUrl}/${encodeURIComponent(projectDir)}`,

    exportProjectApi: (projectDir: string, sessionId?: string) => {
        const baseUrl: string = `${baseExportApiUrl}/${encodeURIComponent(projectDir)}`;
        return sessionId ? `${baseUrl}?sessionId=${sessionId}` : baseUrl;
    },

    importProjectApi: baseImportApiUrl,

    transcribeApi: `${baseVoiceApiUrl}/transcribe`,

    openFolderPickerApi: `${baseFilePickerApiUrl}/folder`,
};

export {apis};
