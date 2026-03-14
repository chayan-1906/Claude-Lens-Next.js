import type {IMessage} from "@/types/message";

/**
 * Walk the JSONL message tree and return only the active branch.
 *
 * Claude Code JSONL is a parentUuid-linked tree — when the user regenerates
 * or edits a message, a new branch is appended with the same parentUuid.
 * The active branch is reconstructed by always picking the child with the
 * latest timestamp at each node (matching how the Claude CLI renders it).
 *
 * If messages lack parentUuid (pre-migration data), returns them as-is.
 */
function getActiveBranch(messages: IMessage[]): IMessage[] {
    // Short-circuit: if no messages have parentUuid, tree-walk is impossible — return as-is
    const hasTreeData: boolean = messages.some((msg: IMessage) => msg.parentUuid !== undefined && msg.parentUuid !== null);
    if (!hasTreeData) return messages;

    // Build a map: parentUuid → children[]
    const childrenMap: Map<string | null, IMessage[]> = new Map();
    for (const message of messages) {
        const key: string | null = message.parentUuid ?? null;
        if (!childrenMap.has(key)) childrenMap.set(key, []);
        childrenMap.get(key)!.push(message);
    }

    // Walk from root, always picking the latest child
    const result: IMessage[] = [];
    let currentUuid: string | null = null; // null = root

    while (true) {
        const children: IMessage[] | undefined = childrenMap.get(currentUuid);
        if (!children?.length) break;

        // Pick the child with the most recent timestamp
        const nextMessage: IMessage = children.reduce((a: IMessage, b: IMessage) =>
            new Date(a.timestamp) > new Date(b.timestamp) ? a : b
        );

        result.push(nextMessage);
        currentUuid = nextMessage.uuid;
    }

    return result;
}

export {getActiveBranch};
