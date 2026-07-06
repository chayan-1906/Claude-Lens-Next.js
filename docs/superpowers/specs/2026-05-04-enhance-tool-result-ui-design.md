# Enhance Tool Result UI — Design Spec
_Date: 2026-05-04_

## Problem

After Claude executes Read, Write, or Edit operations, the `tool_result` block renders as raw monospace text behind a generic `tool_result` collapsible. It is not human-readable and gives no visual indication of what actually changed.

The goal is to bring the UI closer to Claude Code Remote Controlled: rich diff views for Edit/Write, and a formatted file viewer for Read.

---

## Architecture

### Key constraint

`tool_use` blocks live in **assistant messages**; their corresponding `tool_result` blocks live in the following **user message**. They are separate `IMessage` objects and rendered in separate `MessageBubble` components.

### Solution: `toolUseMap`

`ChatSessionView` builds a `Map<string, ToolUseBlock>` (keyed by `tool_use.id`) via `useMemo`, scanning both historical and live messages. This map is threaded down as a prop to `MessageBubble` → `MessageContent` → `ToolResultContentBlock`.

- `ToolCallBlock` needs **no lookup** — it already receives `name` and `input` directly.
- `ToolResultContentBlock` uses the map to look up `block.tool_use_id` and determine which tool produced this result.

---

## Per-tool Behaviour

| Tool              | ToolCallBlock (assistant message)                                                                       | ToolResultContentBlock (user message)                                                        |
|-------------------|---------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| **Edit**          | `✎ Edited <filename> +N-M` header; collapsible `DiffView` using `input.old_string` / `input.new_string` | Success pill `✓ File edited` (green) or error pill `✗ <message>` (red); stub button on hover |
| **Write**         | `📄 Created <filename>` header; collapsible all-green `DiffView` using `input.content`                  | Success pill `✓ File created` or error pill; stub button on hover                            |
| **Read**          | `📖 Read <filename>` header; existing collapse behaviour unchanged                                      | Formatted code view: line numbers + monospace, auto-expanded, `max-h-72` with own scrollbar  |
| **Bash / Others** | Unchanged                                                                                               | Unchanged                                                                                    |

### Diff stats (+N-M) for Edit
Computed locally in `ToolCallBlock`: scan `input.old_string` and `input.new_string` line arrays, count added vs removed lines. Display as `+N` (green) `-M` (red) in the header.

### Error detection in ToolResultContentBlock
`block.is_error === true` → show error pill. Otherwise → success pill.

### Stub button preservation
The existing stub-to-save-tokens button is preserved on the pill row (appears on hover, same as today). Stubbed state renders the existing stubbed placeholder.

### Collapsible defaults
- **Edit / Write** DiffView: starts **collapsed** by default (header is the toggle)
- **Read** formatted view: starts **expanded** (no collapse toggle); can be changed to collapsed later with a one-line state change

---

## Files Changed (frontend-only, 6 files)

| # | File                                        | Change                                                                                                                                        |
|---|---------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | `src/components/ChatSessionView.tsx`        | Add `toolUseMap` via `useMemo`; pass as prop to `MessageBubble`                                                                               |
| 2 | `src/components/MessageBubble.tsx`          | Accept `toolUseMap` prop; forward to `MessageContent`                                                                                         |
| 3 | `src/components/MessageContent.tsx`         | Accept `toolUseMap` prop; forward to `ToolResultContentBlock`                                                                                 |
| 4 | `src/components/ToolCallBlock.tsx`          | Enhanced header + collapsible `DiffView` for Edit/Write; enhanced header for Read                                                             |
| 5 | `src/components/ToolResultContentBlock.tsx` | Success/error pill for Edit/Write; formatted code view for Read                                                                               |
| 6 | `src/types/components.ts`                   | Update `IToolResultContentBlockProps` (add `toolUse?`), `IMessageBubbleProps` (add `toolUseMap?`), `IMessageContentProps` (add `toolUseMap?`) |

No new components. `DiffView` is reused as-is.

---

## Component Details

### `ToolCallBlock` changes

New prop shape:
```typescript
interface IToolCallBlockProps {
    name: string;
    input: Record<string, unknown>;
}
// (unchanged — all data already present in props)
```

Rendering logic:
- `name === 'Edit'`: extract `input.file_path as string`, `input.old_string as string`, `input.new_string as string`; compute diff stats; render header + collapsible `DiffView`
- `name === 'Write'`: extract `input.file_path as string`, `input.content as string`; render header + collapsible all-green `DiffView`
- `name === 'Read'`: extract `input.file_path as string`; render enhanced header only (no diff — content is in tool_result)
- All other names: current behaviour (terminal icon + collapsed JSON)

### `ToolResultContentBlock` changes

New props:
```typescript
interface IToolResultContentBlockProps {
    block: ToolResultBlock;
    toolUse?: ToolUseBlock;   // looked up from toolUseMap by parent
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
}
```

Rendering logic:
- `toolUse?.name === 'Edit' || 'Write'`: render success/error pill + stub button
- `toolUse?.name === 'Read'`: render formatted code view (line numbers, monospace, max-h-72, scrollable)
- No toolUse or other name: current behaviour (collapsible raw text)

### `MessageContent` change

When mapping `tool_result` blocks, look up the `ToolUseBlock` from `toolUseMap` and pass it as `toolUse` to `ToolResultContentBlock`.

### `ChatSessionView` change

```typescript
const toolUseMap = useMemo((): Map<string, ToolUseBlock> => {
    const map = new Map<string, ToolUseBlock>();
    // Process historical (IMessage[]) and live (IChatMessage[]) separately to keep TypeScript happy
    for (const msg of localHistoricalMessages) {
        if (!Array.isArray(msg.content)) continue;
        for (const block of msg.content) {
            if (block.type === 'tool_use') map.set((block as ToolUseBlock).id, block as ToolUseBlock);
        }
    }
    for (const msg of messages) {
        if (!Array.isArray(msg.content)) continue;
        for (const block of msg.content) {
            if (block.type === 'tool_use') map.set((block as ToolUseBlock).id, block as ToolUseBlock);
        }
    }
    return map;
}, [localHistoricalMessages, messages]);
```

---

## Out of Scope

- Syntax highlighting in the Read view (plain monospace only)
- Bash output formatting (unchanged)
- Any backend changes
- Collapsible toggle for the Read formatted view (can be added in one line later)