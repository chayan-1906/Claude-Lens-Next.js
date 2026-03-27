import {stripSystemTags} from "@/utils/stripSystemTags";
import {parseUserMessage} from "@/utils/parseUserMessage";
import {ContentBlock, EUserMessageType, ToolResultContentItem} from "@/types/message";

/**
 * Normalize tool_result content to a plain string.
 * The Claude API returns tool_result content as either a string or an array of
 * content items ({type: "text", text: "..."} | {type: "tool_reference", tool_name: "..."}).
 */
function normalizeToolResultContent(content: string | ToolResultContentItem[]): string {
    if (typeof content === 'string') return content;
    return content.map((item: ToolResultContentItem): string => {
        if (item.type === 'text' && item.text) return item.text;
        if (item.type === 'tool_reference' && item.tool_name) return `[tool: ${item.tool_name}]`;
        return JSON.stringify(item);
    }).join('\n');
}

/**
 * Extracts copyable plain text from message content.
 * Handles both user (string) and assistant (ContentBlock[]) messages.
 * For user strings, parses command XML tags so the output is clean text.
 */
function extractMessageText(content: string | ContentBlock[]): string {
    if (typeof content === 'string') {
        const parsed = parseUserMessage(content);
        switch (parsed.type) {
            case EUserMessageType.SLASH_COMMAND: {
                const parts: string[] = [parsed.command, parsed.args, parsed.remainingText].filter(Boolean);
                return parts.join(' ').trim();
            }
            case EUserMessageType.COMMAND_OUTPUT:
                return parsed.output;
            case EUserMessageType.SYSTEM_CAVEAT:
                return '';
            case EUserMessageType.PLAIN:
            default:
                return stripSystemTags(parsed.text);
        }
    }

    const parts: string[] = content.map((block: ContentBlock): string => {
        switch (block.type) {
            case 'thinking':
                return `[Thinking]\n${block.thinking}`;
            case 'text':
                return stripSystemTags(block.text);
            case 'tool_use':
                return `[Tool: ${block.name}]\n${JSON.stringify(block.input, null, 2)}`;
            case 'tool_result':
                return block.content ? `[Tool Result]\n${normalizeToolResultContent(block.content)}` : '';
            default:
                return '';
        }
    }).filter(Boolean);

    return parts.join('\n\n');
}

/**
 * Extracts only the readable text content from an assistant message for TTS.
 * Skips thinking, tool_use, and tool_result blocks — the user only wants
 * to hear the actual response prose.
 */
function extractSpeakableText(content: string | ContentBlock[]): string {
    if (typeof content === 'string') {
        return extractMessageText(content);
    }

    const parts: string[] = content
        .filter((block: ContentBlock): boolean => block.type === 'text')
        .map((block: ContentBlock): string => stripSystemTags((block as Extract<ContentBlock, {type: 'text'}>).text))
        .filter(Boolean);

    return parts.join('\n\n');
}

export {normalizeToolResultContent, extractMessageText, extractSpeakableText};
