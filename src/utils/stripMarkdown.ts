/**
 * Strips Markdown syntax from text to produce clean, speakable prose for TTS.
 * Code blocks are replaced with a brief "code block omitted" placeholder so the
 * listener knows something was skipped without hearing raw code.
 */
function stripMarkdown(text: string): string {
    return text
        // Fenced code blocks → spoken placeholder
        .replace(/```[\s\S]*?```/g, ' code block omitted ')
        // Inline code → just the content
        .replace(/`([^`]+)`/g, '$1')
        // Images → spoken alt text
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, 'image: $1')
        // Links → just the link text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Bold
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        // Italic
        .replace(/\*([^*]+)\*/g, '$1')
        // Strikethrough
        .replace(/~~([^~]+)~~/g, '$1')
        // Headings
        .replace(/#{1,6}\s/g, '')
        // Blockquotes
        .replace(/>\s/g, '')
        // Unordered list markers
        .replace(/^[-*+]\s/gm, '')
        // Ordered list markers
        .replace(/^\d+\.\s/gm, '')
        // Horizontal rules
        .replace(/^[-*_]{3,}\s*$/gm, '')
        // Collapse multiple blank lines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export {stripMarkdown};
