import {BACKEND_URL} from "@/config/config";
import {TSearchScope} from "@/types/search";

/** Base URL for all API endpoints */
const baseApiUrl: string = `${BACKEND_URL}/api/v1`;

/** Base URL for setup endpoints */
const baseSetupApiUrl: string = `${baseApiUrl}/setup`;

/** Base URL for configuration endpoints */
const baseConfigurationsApiUrl: string = `${baseSetupApiUrl}/configurations`;

/** Base URL for path mapping endpoints */
const basePathMappingsApiUrl: string = `${baseSetupApiUrl}/path-mappings`;

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

/** Base URL for MCP endpoints */
const baseMcpApiUrl: string = `${baseApiUrl}/mcp`;

/** Base URL for R2 endpoints */
const baseR2ApiUrl: string = `${baseApiUrl}/r2`;

/** Base URL for search endpoints */
const baseSearchApiUrl: string = `${baseApiUrl}/search`;

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

    getR2ConfigApi: `${baseSetupApiUrl}/r2-config`,
    saveR2ConfigApi: `${baseSetupApiUrl}/r2-config`,

    getGroqConfigApi: `${baseSetupApiUrl}/groq-config`,
    saveGroqConfigApi: `${baseSetupApiUrl}/groq-config`,

    getAccountsApi: `${baseSetupApiUrl}/accounts`,
    getClaudeAccountApi: `${baseSetupApiUrl}/claude-account`,
    saveClaudeAccountApi: `${baseSetupApiUrl}/claude-account`,

    getPathMappingsApi: basePathMappingsApiUrl,
    createPathMappingApi: basePathMappingsApiUrl,
    updatePathMappingApi: (mappingId: string) => `${basePathMappingsApiUrl}/${mappingId}`,
    deletePathMappingApi: (mappingId: string) => `${basePathMappingsApiUrl}/${mappingId}`,
    mergePathMappingApi: (mappingId: string) => `${basePathMappingsApiUrl}/${mappingId}/merge`,

    getLocalProjectsApi: `${baseSyncApiUrl}/projects`,
    syncApi: baseSyncApiUrl,

    getAllProjectsApi: baseProjectApiUrl,
    renameProjectApi: (projectDir: string) => `${baseProjectApiUrl}/${encodeURIComponent(projectDir)}`,
    deleteProjectApi: (projectDir: string) => `${baseProjectApiUrl}/${encodeURIComponent(projectDir)}`,

    getAllSessionsApi: baseSessionApiUrl,
    getSessionApi: (sessionId: string, params?: { limit?: number; cursor?: string }) => {
        const searchParams: URLSearchParams = new URLSearchParams();
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.cursor) searchParams.set('cursor', params.cursor);

        const queryString: string = searchParams.toString();
        return `${baseSessionApiUrl}/${sessionId}${queryString ? `?${queryString}` : ''}`;
    },
    updateSessionApi: (sessionId: string) => `${baseSessionApiUrl}/${sessionId}`,
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
    getTtsSettingsApi: `${baseVoiceApiUrl}/tts-settings`,
    saveTtsSettingsApi: `${baseVoiceApiUrl}/tts-settings`,

    openFolderPickerApi: `${baseFilePickerApiUrl}/folder`,

    reclaimR2Api: `${baseR2ApiUrl}/reclaim`,

    getMcpServersApi: `${baseMcpApiUrl}/servers`,

    searchApi: (params: { q: string; scope: TSearchScope; sessionId?: string; projectDir?: string; limit?: number; skip?: number; }): string => {
        const searchParams: URLSearchParams = new URLSearchParams();
        searchParams.set('q', params.q);
        searchParams.set('scope', params.scope);
        if (params.sessionId) searchParams.set('sessionId', params.sessionId);
        if (params.projectDir) searchParams.set('projectDir', params.projectDir);
        if (params.limit) searchParams.set('limit', String(params.limit));
        if (params.skip) searchParams.set('skip', String(params.skip));
        return `${baseSearchApiUrl}?${searchParams.toString()}`;
    },
};

export {apis};
