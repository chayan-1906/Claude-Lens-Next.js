import type {ContentBlock} from "@/types/message";
import {stripSystemTags} from "@/utils/stripSystemTags";

/**
 * Extracts copyable plain text from message content.
 * Handles both user (string) and assistant (ContentBlock[]) messages.
 */
function extractMessageText(content: string | ContentBlock[]): string {
    if (typeof content === 'string') {
        return stripSystemTags(content);
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
                return block.content ? `[Tool Result]\n${block.content}` : '';
            default:
                return '';
        }
    }).filter(Boolean);

    return parts.join('\n\n');
}

export {extractMessageText};
