import {EMcpStatus} from "@/types/mcp";
import {MCP_SERVER_NAME_NORMALIZE_REGEX, MCP_TOOL_PREFIX} from "@/utils/constants";

function deriveStatus(rawStatus: string | undefined, disabled: boolean): EMcpStatus {
    if (disabled) return EMcpStatus.DISABLED;
    if (!rawStatus) return EMcpStatus.UNKNOWN;
    switch (rawStatus) {
        case 'connected': return EMcpStatus.CONNECTED;
        case 'needs_authentication': return EMcpStatus.NEEDS_AUTH;
        case 'failed': return EMcpStatus.FAILED;
        case 'disabled': return EMcpStatus.DISABLED;
        default: return EMcpStatus.UNKNOWN;
    }
}

function normalizeServerName(name: string): string {
    return name.replace(MCP_SERVER_NAME_NORMALIZE_REGEX, '_').toLowerCase();
}

function extractServerKey(toolName: string): string | null {
    if (!toolName.startsWith(MCP_TOOL_PREFIX)) return null;
    const rest = toolName.slice(MCP_TOOL_PREFIX.length);
    const idx = rest.indexOf('__');
    if (idx === -1) return null;
    return rest.slice(0, idx);
}

function buildToolsMap(tools: string[]): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    for (const tool of tools) {
        const serverKey = extractServerKey(tool);
        if (!serverKey) continue;
        const toolName = tool.slice(`${MCP_TOOL_PREFIX}${serverKey}__`.length);
        if (!map[serverKey]) map[serverKey] = [];
        map[serverKey].push(toolName);
    }
    return map;
}

function findToolsForServer(name: string, toolsMap: Record<string, string[]>): string[] {
    if (toolsMap[name]) return toolsMap[name];
    const normalized = normalizeServerName(name);
    const key = Object.keys(toolsMap).find((k: string) => normalizeServerName(k) === normalized);
    return key ? toolsMap[key] : [];
}

export {deriveStatus, normalizeServerName, buildToolsMap, findToolsForServer};
