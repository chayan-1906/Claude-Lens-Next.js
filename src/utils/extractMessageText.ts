import {stripSystemTags} from "@/utils/stripSystemTags";
import {parseUserMessage} from "@/utils/parseUserMessage";
import {ContentBlock, EUserMessageType} from "@/types/message";

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
                return block.content ? `[Tool Result]\n${block.content}` : '';
            default:
                return '';
        }
    }).filter(Boolean);

    return parts.join('\n\n');
}

export {extractMessageText};
