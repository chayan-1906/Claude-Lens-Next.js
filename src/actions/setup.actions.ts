"use server";

import {cookies} from "next/headers";
import {apis} from "@/utils/apis";
import {SETUP_CONFIGURED_COOKIE} from "@/types/setup";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";
import type {
    IGetSetupStatusResponse,
    IGetConfigurationsResponse,
    IAddConfigurationParams,
    IAddConfigurationResponse,
    IEditConfigurationParams,
    IEditConfigurationResponse,
    IDeleteConfigurationParams,
    IDeleteConfigurationResponse,
    ITestConfigurationParams,
    ITestConfigurationResponse,
    IActivateConfigurationParams,
    IActivateConfigurationResponse,
    IGetConfigProjectsParams,
    IGetConfigProjectsResponse,
    IMongoConfig,
    IPathMapping,
    IGetPathMappingsResponse,
    ICreatePathMappingParams,
    ICreatePathMappingResponse,
    IUpdatePathMappingParams,
    IUpdatePathMappingResponse,
    IDeletePathMappingParams,
    IDeletePathMappingResponse,
    IMergePathMappingParams,
    IMergePathMappingResponse,
} from "@/types/setup";
import {refreshSidebar} from "@/actions/session.actions";

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

async function getConfigurations(): Promise<IGetConfigurationsResponse> {
    try {
        const response: Response = await fetch(apis.getConfigurationsApi);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = 'Failed to fetch configurations!';
            console.error('Getting configurations failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            configurations: data.configurations as IMongoConfig[],
            activeConfigId: data.activeConfigId as string,
        };
    } catch (error: unknown) {
        console.error('Get configurations error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function addConfiguration({name, uri, description, color}: IAddConfigurationParams): Promise<IAddConfigurationResponse> {
    try {
        const response: Response = await fetch(apis.addConfigurationApi, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, uri, description, color}),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to add configuration!';
            console.error('Add configuration failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'NAME_MISSING') {
                errorMessage = 'Name is required!';
            } else if (errorCode === 'URI_MISSING') {
                errorMessage = 'MongoDB URI is required!';
            } else if (errorCode === 'INVALID_MONGO_URI') {
                errorMessage = data.error?.message || 'Invalid MongoDB URI. Please check and try again!';
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            configuration: data.configuration as IMongoConfig,
        };
    } catch (error: unknown) {
        console.error('Add configuration error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function editConfiguration({configId, name, uri, description, color}: IEditConfigurationParams): Promise<IEditConfigurationResponse> {
    try {
        const response: Response = await fetch(apis.editConfigurationApi(configId), {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name, uri, description, color}),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to update configuration!';
            console.error('Edit configuration failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'INVALID_MONGOURI') {
                errorMessage = data.error?.message || 'Invalid MongoDB URI. Please check and try again!';
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            configuration: data.configuration as IMongoConfig,
        };
    } catch (error: unknown) {
        console.error('Edit configuration error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function deleteConfiguration({configId}: IDeleteConfigurationParams): Promise<IDeleteConfigurationResponse> {
    try {
        const response: Response = await fetch(apis.deleteConfigurationApi(configId), {
            method: 'DELETE',
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to delete configuration!';
            console.error('Delete configuration failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'ACTIVE_CONFIG_DELETE') {
                errorMessage = 'Cannot delete the active configuration! Switch to another one first.';
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
        };
    } catch (error: unknown) {
        console.error('Delete configuration error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function testConfiguration({configId}: ITestConfigurationParams): Promise<ITestConfigurationResponse> {
    try {
        const response: Response = await fetch(apis.testConfigurationApi(configId), {
            method: 'POST',
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = data.error?.message || 'Connection test failed!';
            console.error('Test configuration failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
        };
    } catch (error: unknown) {
        console.error('Test configuration error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function activateConfiguration({configId}: IActivateConfigurationParams): Promise<IActivateConfigurationResponse> {
    try {
        const response: Response = await fetch(apis.activateConfigurationApi(configId), {
            method: 'POST',
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = data.error?.message || 'Failed to activate configuration!';
            console.error('Activate configuration failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        await setSetupConfiguredCookie();
        await refreshSidebar();

        return {
            success: true,
            message: data.message,
        };
    } catch (error: unknown) {
        console.error('Activate configuration error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function getConfigProjects({configId}: IGetConfigProjectsParams): Promise<IGetConfigProjectsResponse> {
    try {
        const response: Response = await fetch(apis.getConfigProjectsApi(configId));
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = data.error?.message || 'Failed to fetch projects!';
            console.error('Get config projects failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            projects: data.projects as { rawProjectDir: string; projectDir: string }[],
        };
    } catch (error: unknown) {
        console.error('Get config projects error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

// ======================== Path Mapping Actions ========================

async function getPathMappings(): Promise<IGetPathMappingsResponse> {
    try {
        const response: Response = await fetch(apis.getPathMappingsApi);
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = 'Failed to fetch path mappings!';
            console.error('Getting path mappings failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            pathMappings: data.pathMappings as IPathMapping[],
        };
    } catch (error: unknown) {
        console.error('Get path mappings error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function createPathMapping({label, paths, canonicalPath}: ICreatePathMappingParams): Promise<ICreatePathMappingResponse> {
    try {
        const response: Response = await fetch(apis.createPathMappingApi, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({label, paths, canonicalPath}),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to create path mapping!';
            console.error('Create path mapping failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'LABEL_MISSING') {
                errorMessage = 'Label is required!';
            } else if (errorCode === 'INVALID_PATHS') {
                errorMessage = 'At least 2 paths are required!';
            } else if (errorCode === 'CANONICALPATH_MISSING') {
                errorMessage = 'Canonical path is required!';
            } else if (errorCode === 'INVALID_CANONICALPATH') {
                errorMessage = 'Canonical path must be one of the listed paths!';
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            pathMapping: data.pathMapping as IPathMapping,
        };
    } catch (error: unknown) {
        console.error('Create path mapping error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function updatePathMapping({mappingId, label, paths, canonicalPath}: IUpdatePathMappingParams): Promise<IUpdatePathMappingResponse> {
    try {
        const response: Response = await fetch(apis.updatePathMappingApi(mappingId), {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({label, paths, canonicalPath}),
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            let errorMessage: string = 'Failed to update path mapping!';
            console.error('Update path mapping failed:', {code: errorCode, message: data.error?.message});

            if (errorCode === 'INVALID_PATHS') {
                errorMessage = 'At least 2 paths are required!';
            } else if (errorCode === 'INVALID_CANONICALPATH') {
                errorMessage = 'Canonical path must be one of the listed paths!';
            }

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            pathMapping: data.pathMapping as IPathMapping,
        };
    } catch (error: unknown) {
        console.error('Update path mapping error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function deletePathMapping({mappingId}: IDeletePathMappingParams): Promise<IDeletePathMappingResponse> {
    try {
        const response: Response = await fetch(apis.deletePathMappingApi(mappingId), {
            method: 'DELETE',
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = data.error?.message || 'Failed to delete path mapping!';
            console.error('Delete path mapping failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
        };
    } catch (error: unknown) {
        console.error('Delete path mapping error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
}

async function mergePathMapping({mappingId}: IMergePathMappingParams): Promise<IMergePathMappingResponse> {
    try {
        const response: Response = await fetch(apis.mergePathMappingApi(mappingId), {
            method: 'POST',
        });
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            const errorCode: string | number = data.error?.code || '';
            const errorMessage: string = data.error?.message || 'Failed to merge path mapping data!';
            console.error('Merge path mapping failed:', {code: errorCode, message: data.error?.message});

            return {
                success: false,
                error: errorMessage,
            };
        }

        return {
            success: true,
            message: data.message,
            sessionsUpdated: data.sessionsUpdated as number,
            memoriesUpdated: data.memoriesUpdated as number,
        };
    } catch (error: unknown) {
        console.error('Merge path mapping error:', error);
        return {
            success: false,
            error: 'Something went wrong. Please try again!',
        };
    }
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

export {
    getSetupStatus,
    getConfigurations,
    addConfiguration,
    editConfiguration,
    deleteConfiguration,
    testConfiguration,
    activateConfiguration,
    getConfigProjects,
    setSetupConfiguredCookie,
    getPathMappings,
    createPathMapping,
    updatePathMapping,
    deletePathMapping,
    mergePathMapping,
};
