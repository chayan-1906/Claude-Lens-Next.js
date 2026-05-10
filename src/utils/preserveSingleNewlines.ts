import {FENCED_CODE_BLOCK_REGEX, SINGLE_NEWLINE_REGEX} from "@/utils/constants";

/**
 * Converts every plain `\n` into `  \n` — GFM's hard-line-break syntax — so
 * single newlines in user-typed text render as actual line breaks instead of
 * being collapsed into a space by CommonMark.
 *
 * Fenced code blocks (``` and ~~~) are preserved verbatim so the trailing
 * two spaces don't leak into pasted code.
 */
function preserveSingleNewlines(text: string): string {
    const parts: string[] = text.split(FENCED_CODE_BLOCK_REGEX);
    return parts
        .map((part: string, index: number): string => (index % 2 === 0 ? part.replace(SINGLE_NEWLINE_REGEX, '  \n') : part))
        .join('');
}

export {preserveSingleNewlines};
