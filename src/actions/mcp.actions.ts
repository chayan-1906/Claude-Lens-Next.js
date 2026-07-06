"use server";

import {apis} from "@/utils/apis";
import {IGetMcpServersResponse, IMcpServerConfig} from "@/types/mcp";
import {ApiResponseClass, parseApiResponse} from "@/utils/ApiResponse";

async function getMcpServers(): Promise<IGetMcpServersResponse> {
    try {
        const response: Response = await fetch(apis.getMcpServersApi, {cache: 'no-store'});
        const data: ApiResponseClass = await parseApiResponse(response);

        if (!response.ok || !data.success) {
            console.error('Getting MCP servers failed:', {code: data.error?.code, message: data.error?.message});
            return {success: false, error: 'Failed to fetch MCP servers!'};
        }

        return {
            success: true,
            servers: data.servers as IMcpServerConfig[],
        };
    } catch (error: unknown) {
        console.error('getMcpServers error:', error);
        return {success: false, error: 'Something went wrong. Please try again!'};
    }
}

export {getMcpServers};
