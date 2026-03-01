import {EUserMessageType} from "@/types/message";
import type {ParsedUserMessage} from "@/types/message";

/**
 * Parses a user message string for Claude Code injected XML tags.
 *
 * Group 1 (slash command):  <command-name>, <command-message>, <command-args>
 * Group 2 (terminal output): <local-command-stdout>
 * Group 3 (system caveat):   <local-command-caveat> → hidden entirely
 */
function parseUserMessage(text: string): ParsedUserMessage {
    // Group 3 — system caveat → hide entirely
    if (text.includes('<local-command-caveat>')) {
        return {type: EUserMessageType.SYSTEM_CAVEAT};
    }

    // Group 1 — slash command badge
    if (text.includes('<command-name>')) {
        const commandMatch: RegExpExecArray | null = /<command-name>([\s\S]*?)<\/command-name>/.exec(text);
        const argsMatch: RegExpExecArray | null = /<command-args>([\s\S]*?)<\/command-args>/.exec(text);
        const command: string = commandMatch?.[1]?.trim() ?? '';
        const args: string = argsMatch?.[1]?.trim() ?? '';

        const remainingText: string = text
            .replace(/<command-name>[\s\S]*?<\/command-name>/, '')
            .replace(/<command-message>[\s\S]*?<\/command-message>/, '')
            .replace(/<command-args>[\s\S]*?<\/command-args>/, '')
            .trim();

        return {type: EUserMessageType.SLASH_COMMAND, command, args, remainingText};
    }

    // Group 2 — terminal output
    if (text.includes('<local-command-stdout>')) {
        const match: RegExpExecArray | null = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/.exec(text);
        const output: string = match?.[1] ?? text;
        return {type: EUserMessageType.COMMAND_OUTPUT, output};
    }

    // Plain text
    return {type: EUserMessageType.PLAIN, text};
}

export {parseUserMessage};
