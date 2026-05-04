export const ANSI_ESCAPE_REGEX: RegExp = /\x1b\[[0-9;]*m/g;

/** Regex matching "[Image: source: /local/path]" — Claude Code's local image reference format */
export const LOCAL_IMAGE_REF_REGEX: RegExp = /^\[Image: source: ([^\]]+)\]$/;
export const IMAGE_EXTENSION_REGEX: RegExp = /\.(png|jpg|jpeg|gif|webp|heic|heif|bmp|svg)$/i;

// Matches backend-generated attachment text: "File attached: filename — https://..."
// Captures: [1] filename, [2] URL
export const FILE_ATTACHED_REGEX: RegExp = /^File attached: (.+?) — (https?:\/\/.+)$/;

/** Normalizes MCP server names by replacing colons, hyphens, and whitespace with underscores */
export const MCP_SERVER_NAME_NORMALIZE_REGEX: RegExp = /[:\-\s]/g;

/** Strips <tool_use_error>...</tool_use_error> XML wrapper tags, keeping inner text */
export const TOOL_USE_ERROR_TAG_REGEX: RegExp = /<tool_use_error>([\s\S]*?)<\/tool_use_error>/g;

/** Matches the MCP tool name prefix: "mcp__<serverKey>__" */
export const MCP_TOOL_PREFIX = 'mcp__';