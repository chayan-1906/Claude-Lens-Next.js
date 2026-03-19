import {ANSI_ESCAPE_REGEX} from "@/utils/constants";

/**
 * Strips ANSI escape codes (color, style, cursor) from terminal output.
 * Handles SGR sequences like \x1b[38;5;244m, \x1b[0m, \x1b[1;31m, etc.
 */
function stripAnsiCodes(text: string): string {
    return text.replace(ANSI_ESCAPE_REGEX, '');
}

export {stripAnsiCodes};
