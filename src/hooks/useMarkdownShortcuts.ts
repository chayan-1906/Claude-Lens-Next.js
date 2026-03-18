"use client";

import React from "react";
import type {IApplyFormatResult, IMarkdownFormat} from "@/types/markdown";

/** Supported markdown formatting shortcuts */
const MARKDOWN_FORMATS: Record<string, IMarkdownFormat> = {
    bold: {prefix: '**', suffix: '**'},
    italic: {prefix: '*', suffix: '*'},
    underline: {prefix: '<u>', suffix: '</u>'},
    strikethrough: {prefix: '~~', suffix: '~~'},
    inlineCode: {prefix: '`', suffix: '`'},
    link: {prefix: '[', suffix: '](url)'},
    codeBlock: {prefix: '```\n', suffix: '\n```'},
};

/** Resolve a keyboard event to its markdown format (null if no match) */
function getFormatForKeyEvent(e: React.KeyboardEvent<HTMLTextAreaElement>): IMarkdownFormat | null {
    if (!e.metaKey) return null;
    const key: string = e.key.toLowerCase();
    if (e.shiftKey) {
        if (key === 'x') return MARKDOWN_FORMATS.strikethrough;
        if (key === 'k') return MARKDOWN_FORMATS.link;
        if (key === 'e') return MARKDOWN_FORMATS.codeBlock;
    } else {
        if (key === 'b') return MARKDOWN_FORMATS.bold;
        if (key === 'i') return MARKDOWN_FORMATS.italic;
        if (key === 'u') return MARKDOWN_FORMATS.underline;
        if (key === 'e') return MARKDOWN_FORMATS.inlineCode;
    }
    return null;
}

/** Apply or toggle markdown format around a selection, returning new text and cursor range */
function applyMarkdownFormat(text: string, selStart: number, selEnd: number, format: IMarkdownFormat): IApplyFormatResult {
    const {prefix, suffix}: IMarkdownFormat = format;
    const hasSelection: boolean = selStart !== selEnd;

    if (hasSelection) {
        const selected: string = text.slice(selStart, selEnd);

        // Link toggle: suffix varies (user may have replaced 'url' placeholder), use regex
        if (format === MARKDOWN_FORMATS.link && selStart > 0) {
            const charBefore: string = text[selStart - 1];
            if (charBefore === '[') {
                const afterSelection: string = text.slice(selEnd);
                const linkSuffixMatch: RegExpMatchArray | null = afterSelection.match(/^\]\([^)]*\)/);
                if (linkSuffixMatch) {
                    const suffixLen: number = linkSuffixMatch[0].length;
                    const newText: string = text.slice(0, selStart - 1) + selected + text.slice(selEnd + suffixLen);
                    return {newText, selStart: selStart - 1, selEnd: selEnd - 1};
                }
            }
        }

        // General toggle: exact prefix/suffix match around the selection
        const hasPrefixRoom: boolean = selStart >= prefix.length;
        const hasSuffixRoom: boolean = selEnd + suffix.length <= text.length;

        if (hasPrefixRoom && hasSuffixRoom) {
            const prefixBefore: string = text.slice(selStart - prefix.length, selStart);
            const suffixAfter: string = text.slice(selEnd, selEnd + suffix.length);

            if (prefixBefore === prefix && suffixAfter === suffix) {
                // Unwrap
                const newText: string = text.slice(0, selStart - prefix.length) + selected + text.slice(selEnd + suffix.length);
                return {newText, selStart: selStart - prefix.length, selEnd: selEnd - prefix.length};
            }
        }

        // Wrap
        const newText: string = text.slice(0, selStart) + prefix + selected + suffix + text.slice(selEnd);

        // Link: select the 'url' placeholder so the user can immediately type the actual URL
        if (format === MARKDOWN_FORMATS.link) {
            const urlStart: number = selEnd + prefix.length + 2;
            const urlEnd: number = urlStart + 3;
            return {newText, selStart: urlStart, selEnd: urlEnd};
        }

        return {newText, selStart: selStart + prefix.length, selEnd: selEnd + prefix.length};
    }

    // No selection — insert syntax pair and place cursor between them
    const newText: string = text.slice(0, selStart) + prefix + suffix + text.slice(selStart);
    const cursorPos: number = selStart + prefix.length;
    return {newText, selStart: cursorPos, selEnd: cursorPos};
}

/**
 * Intercepts Markdown keyboard shortcuts (Cmd+B, Cmd+I, etc.) in a textarea.
 * Returns a keydown handler — returns true when a shortcut was processed, false otherwise.
 */
function useMarkdownShortcuts(
    textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    text: string,
    setText: React.Dispatch<React.SetStateAction<string>>,
): (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean {
    const handleMarkdownKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
        const format: IMarkdownFormat | null = getFormatForKeyEvent(e);
        if (!format) {
            return false;
        }

        const textarea: HTMLTextAreaElement | null = textareaRef.current;
        if (!textarea) {
            return false;
        }

        e.preventDefault();

        const result: IApplyFormatResult = applyMarkdownFormat(text, textarea.selectionStart, textarea.selectionEnd, format);

        setText(result.newText);

        // Restore cursor/selection after React commits the DOM update
        requestAnimationFrame((): void => {
            textarea.setSelectionRange(result.selStart, result.selEnd);
        });

        return true;
    }, [textareaRef, text, setText]);

    return handleMarkdownKeyDown;
}

export {useMarkdownShortcuts};
