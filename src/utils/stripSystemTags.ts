/**
 * Strips <system-reminder>...</system-reminder> tags from text content.
 * These are internal Claude Code instructions injected into assistant messages
 * and should not be rendered in the UI.
 */
function stripSystemTags(text: string): string {
    return text
        .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
        .trim();
}

export {stripSystemTags};
