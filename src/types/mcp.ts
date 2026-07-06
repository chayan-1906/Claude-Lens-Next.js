/** ------------- Constants and Type Aliases ------------- */

export type McpServerGroup = 'user' | 'project';

export enum EMcpStatus {
    CONNECTED = 'connected',
    NEEDS_AUTH = 'needs_authentication',
    FAILED = 'failed',
    DISABLED = 'disabled',
    UNKNOWN = 'unknown',
}


/** ------------- API response types ------------- */

export interface IMcpServerConfig {
    name: string;
    group: McpServerGroup;
    type: string;
    command?: string;
    args?: string[];
    url?: string;
    disabled: boolean;
}

/** Live status entry from the system event mcp_servers array */
export interface IMcpServerLiveStatus {
    name: string;
    status: string;
}

/** Merged server entry combining config (from backend) + live status (from WS system event) */
export interface IMcpServer {
    name: string;
    group: McpServerGroup;
    type: string;
    command?: string;
    args?: string[];
    url?: string;
    disabled: boolean;
    status: EMcpStatus;
    tools: string[];
}


/** ------------- function params ------------- */

export interface IGetMcpServersResponse {
    success: boolean;
    servers?: IMcpServerConfig[];
    error?: string;
}
