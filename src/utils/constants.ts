export const ANSI_ESCAPE_REGEX: RegExp = /\x1b\[[0-9;]*m/g;

/** Regex matching "[Image: source: /local/path]" — Claude Code's local image reference format */
export const LOCAL_IMAGE_REF_REGEX: RegExp = /^\[Image: source: ([^\]]+)\]$/;
export const IMAGE_EXTENSION_REGEX: RegExp = /\.(png|jpg|jpeg|gif|webp|heic|heif|bmp|svg)$/i;
