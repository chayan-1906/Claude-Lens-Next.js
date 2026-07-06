# Enhance Tool Result UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw `tool_result` text block with rich diff views for Edit/Write and a formatted code viewer for Read, wiring tool context via a `toolUseMap` built in `ChatSessionView`.

**Architecture:** `ChatSessionView` builds a `Map<tool_use_id, ToolUseBlock>` via `useMemo` and threads it down to `ToolResultContentBlock` through two paths — via `MessageBubble → MessageContent` for historical messages, and via `MessageContent` directly for live messages. `ToolCallBlock` needs no lookup since it already receives `name` and `input`.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS, `react-icons/hi`, existing `DiffView` component.

**No test suite exists** — verification is done by running the dev server and inspecting the UI.

---

## File Map

| File                                        | Change                                                                                                                                             |
|---------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| `src/types/components.ts`                   | Add `ToolUseBlock` import; add `toolUse?` to `IToolResultContentBlockProps`; add `toolUseMap?` to `IMessageBubbleProps` and `IMessageContentProps` |
| `src/components/ToolCallBlock.tsx`          | Full rewrite — Edit/Write show collapsible `DiffView`, Read shows enhanced header, others unchanged                                                |
| `src/components/ToolResultContentBlock.tsx` | Full rewrite — Edit/Write show success/error pill, Read shows scrollable code view, others unchanged                                               |
| `src/components/MessageContent.tsx`         | Accept `toolUseMap?`; look up `toolUse` and pass to `ToolResultContentBlock`                                                                       |
| `src/components/MessageBubble.tsx`          | Accept + forward `toolUseMap?` to `MessageContent`                                                                                                 |
| `src/components/ChatSessionView.tsx`        | Build `toolUseMap` via `useMemo`; pass to `MessageBubble` (historical) and `MessageContent` (live)                                                 |

---

## Task 1: Update type interfaces

**File:** `src/types/components.ts`

- [ ] **Step 1: Add `ToolUseBlock` to the import from `@/types/message`**

Current line 8:
```typescript
import {ContentBlock, IMessage, ThinkingBlock, ToolResultBlock} from "@/types/message";
```
Replace with:
```typescript
import {ContentBlock, IMessage, ThinkingBlock, ToolResultBlock, ToolUseBlock} from "@/types/message";
```

- [ ] **Step 2: Add `toolUse?` to `IToolResultContentBlockProps`**

Current:
```typescript
export interface IToolResultContentBlockProps {
    block: ToolResultBlock;
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
}
```
Replace with:
```typescript
export interface IToolResultContentBlockProps {
    block: ToolResultBlock;
    toolUse?: ToolUseBlock;
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
}
```

- [ ] **Step 3: Add `toolUseMap?` to `IMessageBubbleProps`**

Current:
```typescript
export interface IMessageBubbleProps {
    message: IMessage;
    index: number;
    sessionId?: string;
    isSubAgentPrompt?: boolean;
    canEdit?: boolean;
    onEdit?: (uuid: string) => void;
    onRegenerate?: (clickedIndex: number) => void;
    onStubbed?: (messageId: string) => void;
    tts?: IUseTextToSpeechReturn;
}
```
Replace with:
```typescript
export interface IMessageBubbleProps {
    message: IMessage;
    index: number;
    sessionId?: string;
    isSubAgentPrompt?: boolean;
    canEdit?: boolean;
    onEdit?: (uuid: string) => void;
    onRegenerate?: (clickedIndex: number) => void;
    onStubbed?: (messageId: string) => void;
    tts?: IUseTextToSpeechReturn;
    toolUseMap?: Map<string, ToolUseBlock>;
}
```

- [ ] **Step 4: Add `toolUseMap?` to `IMessageContentProps`**

Current:
```typescript
export interface IMessageContentProps {
    content: string | ContentBlock[];
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
}
```
Replace with:
```typescript
export interface IMessageContentProps {
    content: string | ContentBlock[];
    sessionId?: string;
    messageId?: string;
    onStubbed?: (messageId: string) => void;
    toolUseMap?: Map<string, ToolUseBlock>;
}
```

- [ ] **Step 5: Start the dev server and confirm it still compiles**

```bash
cd /Volumes/padmanabhadas/Chayan_Personal/all-next-js-projects/claude-lens/project
npm run dev
```
Expected: no TypeScript errors. The UI is unchanged at this point.

---

## Task 2: Enhance ToolCallBlock

**File:** `src/components/ToolCallBlock.tsx`

The component already receives `name` and `input` — no new props needed. Import `DiffView` directly (not via `dynamic`) since `ToolCallBlock` is already lazy-loaded by `MessageContent`.

Diff stats are computed with a simple set-difference heuristic (accurate enough for the header label; the DiffView below shows the precise diff).

- [ ] **Step 1: Replace the entire file with the enhanced version**

```tsx
"use client";

import React from "react";
import {HiOutlineChevronRight, HiOutlineTerminal} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {DiffView} from "@/components/DiffView";
import {Button} from "@/components/ui/Button";
import type {IToolCallBlockProps} from "@/types/components";
import {CopyMessageButton} from "@/components/CopyMessageButton";

function getDiffStats(oldStr: string, newStr: string): {added: number; removed: number} {
    const oldLines: string[] = oldStr.split('\n');
    const newLines: string[] = newStr.split('\n');
    const removed: number = oldLines.filter((l: string) => !newLines.includes(l)).length;
    const added: number = newLines.filter((l: string) => !oldLines.includes(l)).length;
    return {added, removed};
}

const ToolCallBlock = React.memo(function ToolCallBlock({name, input}: IToolCallBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);

    if (name === 'Edit') {
        const filePath: string = (input.file_path as string) ?? '';
        const fileName: string = filePath.split('/').pop() ?? filePath;
        const oldString: string = (input.old_string as string) ?? '';
        const newString: string = (input.new_string as string) ?? '';
        const {added, removed} = getDiffStats(oldString, newString);

        return (
            <div className={'border border-primary/30 rounded-lg overflow-hidden'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100 gap-1.5'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform shrink-0', isOpen && 'rotate-90')}/>
                    <span className={'text-text-muted shrink-0'}>✎</span>
                    <span className={'font-mono text-text-muted shrink-0'}>Edited</span>
                    <span className={'font-mono text-text truncate flex-1 text-left'}>{fileName}</span>
                    <span className={'font-mono text-success shrink-0'}>+{added}</span>
                    <span className={'font-mono text-error shrink-0 mr-1'}>-{removed}</span>
                </Button>
                {isOpen && (
                    <div className={'border-t border-primary/20'}>
                        <DiffView toolName={'Edit'} filePath={filePath} oldString={oldString} newString={newString}/>
                    </div>
                )}
            </div>
        );
    }

    if (name === 'Write') {
        const filePath: string = (input.file_path as string) ?? '';
        const fileName: string = filePath.split('/').pop() ?? filePath;
        const content: string = (input.content as string) ?? '';

        return (
            <div className={'border border-primary/30 rounded-lg overflow-hidden'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100 gap-1.5'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform shrink-0', isOpen && 'rotate-90')}/>
                    <span className={'text-text-muted shrink-0'}>📄</span>
                    <span className={'font-mono text-text-muted shrink-0'}>Created</span>
                    <span className={'font-mono text-text truncate flex-1 text-left'}>{fileName}</span>
                </Button>
                {isOpen && (
                    <div className={'border-t border-primary/20'}>
                        <DiffView toolName={'Write'} filePath={filePath} content={content}/>
                    </div>
                )}
            </div>
        );
    }

    if (name === 'Read') {
        const filePath: string = (input.file_path as string) ?? '';
        const fileName: string = filePath.split('/').pop() ?? filePath;

        return (
            <div className={'border border-primary/30 rounded-lg overflow-hidden'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100 gap-1.5'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform shrink-0', isOpen && 'rotate-90')}/>
                    <span className={'text-text-muted shrink-0'}>📖</span>
                    <span className={'font-mono text-text-muted shrink-0'}>Read</span>
                    <span className={'font-mono text-text truncate flex-1 text-left'}>{fileName}</span>
                </Button>
                {isOpen && (
                    <div className={'relative px-3 pb-3'}>
                        <div className={'absolute right-4 top-1'}>
                            <CopyMessageButton text={JSON.stringify(input, null, 2)}/>
                        </div>
                        <pre className={'text-xs font-mono text-text-muted whitespace-pre-wrap bg-code-bg rounded-md p-3 pr-10 overflow-x-auto'}>
                            {JSON.stringify(input, null, 2) || '{}'}
                        </pre>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={'border border-primary/30 rounded-lg overflow-hidden'}>
            <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)} className={'flex w-full justify-start text-xs active:bg-transparent active:scale-100'}>
                <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                <HiOutlineTerminal className={'size-3 text-text-muted'}/>
                <span className={'font-mono text-text-muted'}>{name}</span>
            </Button>
            {isOpen && (
                <div className={'relative px-3 pb-3'}>
                    <div className={'absolute right-4 top-1'}>
                        <CopyMessageButton text={JSON.stringify(input, null, 2)}/>
                    </div>
                    <pre className={'text-xs font-mono text-text-muted whitespace-pre-wrap bg-code-bg rounded-md p-3 pr-10 overflow-x-auto'}>
                        {JSON.stringify(input, null, 2) || '{}'}
                    </pre>
                </div>
            )}
        </div>
    );
});

export {ToolCallBlock};
```

- [ ] **Step 2: Verify in dev server**

Open a historical session that has Edit or Write tool calls. Confirm:
- Edit: shows `✎ Edited filename.ts +N-M` header; click expands DiffView
- Write: shows `📄 Created filename.ts` header; click expands all-green DiffView
- Read: shows `📖 Read filename.ts` header; click shows the JSON input (unchanged)
- Other tools (Bash, etc.): unchanged behaviour

---

## Task 3: Enhance ToolResultContentBlock

**File:** `src/components/ToolResultContentBlock.tsx`

The stub modal JSX is extracted into a local `StubModal` function to avoid repeating it across three render paths. The `toolUse` prop is optional — if absent, falls back to current behaviour.

- [ ] **Step 1: Replace the entire file with the enhanced version**

```tsx
"use client";

import React from "react";
import {HiOutlineChevronRight, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineTrash} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {stubToolResults} from "@/actions/message.actions";
import type {IToolResultContentBlockProps} from "@/types/components";
import {normalizeToolResultContent} from "@/utils/extractMessageText";

interface IStubModalProps {
    isOpen: boolean;
    onOpenChange: (v: boolean) => void;
    estimatedTokens: number;
    error: string | null;
    isStubbing: boolean;
    onStub: () => void;
}

function StubModal({isOpen, onOpenChange, estimatedTokens, error, isStubbing, onStub}: IStubModalProps): React.ReactElement {
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <div className={'p-6'}>
                <h2 className={'text-base font-semibold text-text'}>{'Remove tool result content?'}</h2>
                <p className={'text-sm text-text-muted mt-2'}>
                    This frees ~{estimatedTokens.toLocaleString()} tokens. The tool call will be kept!
                </p>
                {error && (
                    <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                )}
                <div className={'flex items-center justify-end gap-2 mt-5'}>
                    <Button variant={'ghost'} size={'sm'} onClick={() => onOpenChange(false)} disabled={isStubbing}>
                        Cancel
                    </Button>
                    <Button variant={'danger'} size={'sm'} onClick={onStub} isLoading={isStubbing}>
                        Remove
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

const ToolResultContentBlock = React.memo(function ToolResultContentBlock({block, toolUse, sessionId, messageId, onStubbed}: IToolResultContentBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [isStubbing, setIsStubbing] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const contentText: string = normalizeToolResultContent(block.content);
    const estimatedTokens: number = block._stubbed
        ? (block._originalTokenCount ?? 0)
        : Math.round(contentText.length / 4);
    const canStub: boolean = !block._stubbed && !!sessionId && !!messageId && !!onStubbed;

    const handleStub = React.useCallback(async (): Promise<void> => {
        if (!sessionId || !messageId || !onStubbed) return;
        setIsStubbing(true);
        setError(null);
        const result = await stubToolResults(sessionId, [messageId]);
        if (!result.success) {
            setError(result.error || 'Failed to remove content!');
            setIsStubbing(false);
            return;
        }
        setIsModalOpen(false);
        setIsStubbing(false);
        onStubbed(messageId);
    }, [sessionId, messageId, onStubbed]);

    if (block._stubbed) {
        return (
            <div className={'text-xs text-text-muted bg-surface border border-primary/30 rounded-md p-3 font-mono'}>
                {contentText}
            </div>
        );
    }

    const toolName: string | undefined = toolUse?.name;

    // Edit / Write — success or error pill
    if (toolName === 'Edit' || toolName === 'Write') {
        const label: string = toolName === 'Edit' ? 'File edited' : 'File created';

        if (block.is_error) {
            return (
                <div className={'group/tool-result flex items-center gap-2 px-3 py-2 rounded-lg border border-error/30 bg-error/5'}>
                    <HiOutlineXCircle className={'size-3.5 text-error shrink-0'}/>
                    <span className={'text-xs text-error font-mono flex-1 truncate'}>{contentText || 'Error'}</span>
                    {canStub && (
                        <Button variant={'ghost'} size={'icon'} onClick={() => setIsModalOpen(true)}
                                className={'size-6 opacity-0 group-hover/tool-result:opacity-100 text-text-muted hover:text-warning shrink-0'}>
                            <HiOutlineTrash className={'size-3'}/>
                        </Button>
                    )}
                    <StubModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} estimatedTokens={estimatedTokens} error={error} isStubbing={isStubbing} onStub={handleStub}/>
                </div>
            );
        }

        return (
            <div className={'group/tool-result flex items-center gap-2 px-3 py-2 rounded-lg border border-success/30 bg-success/5'}>
                <HiOutlineCheckCircle className={'size-3.5 text-success shrink-0'}/>
                <span className={'text-xs text-success font-mono'}>{label}</span>
                {canStub && (
                    <Button variant={'ghost'} size={'icon'} onClick={() => setIsModalOpen(true)}
                            className={'size-6 opacity-0 group-hover/tool-result:opacity-100 text-text-muted hover:text-warning shrink-0 ml-auto'}>
                        <HiOutlineTrash className={'size-3'}/>
                    </Button>
                )}
                <StubModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} estimatedTokens={estimatedTokens} error={error} isStubbing={isStubbing} onStub={handleStub}/>
            </div>
        );
    }

    // Read — scrollable formatted code view
    if (toolName === 'Read') {
        return (
            <div className={'group/tool-result border border-primary/30 rounded-lg overflow-hidden'}>
                <div className={'flex items-center px-3 py-2 bg-background border-b border-border'}>
                    <span className={'text-xs font-mono text-text-muted flex-1'}>file content</span>
                    <span className={'text-[10px] text-text-muted/60 mr-1'}>-{estimatedTokens.toLocaleString()} tokens</span>
                    {canStub && (
                        <Button variant={'ghost'} size={'icon'} onClick={() => setIsModalOpen(true)}
                                className={'size-6 opacity-0 group-hover/tool-result:opacity-100 text-text-muted hover:text-warning shrink-0'}>
                            <HiOutlineTrash className={'size-3'}/>
                        </Button>
                    )}
                </div>
                <div className={'overflow-y-auto max-h-72 bg-code-bg'}>
                    <pre className={'text-xs font-mono text-text-muted p-3 whitespace-pre-wrap leading-5'}>
                        {contentText}
                    </pre>
                </div>
                <StubModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} estimatedTokens={estimatedTokens} error={error} isStubbing={isStubbing} onStub={handleStub}/>
            </div>
        );
    }

    // All others — existing behaviour
    return (
        <div className={'group/tool-result border border-primary/30 rounded-lg overflow-hidden'}>
            <div className={'flex items-center'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex items-center gap-2 flex-1 justify-start text-xs text-text-muted hover:bg-transparent active:bg-transparent active:scale-100'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                    <span className={'font-mono'}>tool_result</span>
                    <span className={'text-text-muted/60'}>-{estimatedTokens.toLocaleString()} tokens</span>
                </Button>
                {canStub && (
                    <Button variant={'ghost'} size={'icon'} onClick={() => setIsModalOpen(true)} title={'Remove tool_result content'}
                            className={'size-7 opacity-0 group-hover/tool-result:opacity-100 text-text-muted hover:text-warning shrink-0 mr-1'}>
                        <HiOutlineTrash className={'size-3.5'}/>
                    </Button>
                )}
            </div>
            {isOpen && (
                <div className={'px-3 py-3 text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed bg-code-bg max-h-64 overflow-y-auto'}>
                    {contentText}
                </div>
            )}
            <StubModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} estimatedTokens={estimatedTokens} error={error} isStubbing={isStubbing} onStub={handleStub}/>
        </div>
    );
});

export {ToolResultContentBlock};
```

- [ ] **Step 2: Verify in dev server**

At this point `toolUse` is always `undefined` (not wired yet), so the component falls back to existing behaviour. Confirm the UI is unchanged — no regressions.

---

## Task 4: Wire toolUseMap through MessageContent

**File:** `src/components/MessageContent.tsx`

- [ ] **Step 1: Add `toolUseMap` to the destructured props**

Current signature:
```tsx
const MessageContent = React.memo(function MessageContent({content, sessionId, messageId, onStubbed}: IMessageContentProps) {
```
Replace with:
```tsx
const MessageContent = React.memo(function MessageContent({content, sessionId, messageId, onStubbed, toolUseMap}: IMessageContentProps) {
```

- [ ] **Step 2: Look up `toolUse` and pass it when rendering `tool_result` blocks**

Current `tool_result` case (around line 114):
```tsx
case 'tool_result':
    return (
        <ToolResultContentBlock key={index} block={block as ToolResultBlock} sessionId={sessionId} messageId={messageId} onStubbed={onStubbed}/>
    );
```
Replace with:
```tsx
case 'tool_result': {
    const toolResultBlock = block as ToolResultBlock;
    const toolUse = toolUseMap?.get(toolResultBlock.tool_use_id);
    return (
        <ToolResultContentBlock key={index} block={toolResultBlock} toolUse={toolUse} sessionId={sessionId} messageId={messageId} onStubbed={onStubbed}/>
    );
}
```

- [ ] **Step 3: Verify in dev server**

`toolUseMap` is still not passed from parent yet so `toolUse` is `undefined` — behaviour unchanged. Confirm no TypeScript errors and no visual regressions.

---

## Task 5: Thread toolUseMap through MessageBubble

**File:** `src/components/MessageBubble.tsx`

- [ ] **Step 1: Add `toolUseMap` to the destructured props**

Current signature (line 20):
```tsx
const MessageBubble = React.memo(function MessageBubble({message, canEdit, onEdit, index, onRegenerate, sessionId, isSubAgentPrompt = false, onStubbed, tts}: IMessageBubbleProps) {
```
Replace with:
```tsx
const MessageBubble = React.memo(function MessageBubble({message, canEdit, onEdit, index, onRegenerate, sessionId, isSubAgentPrompt = false, onStubbed, tts, toolUseMap}: IMessageBubbleProps) {
```

- [ ] **Step 2: Forward `toolUseMap` to `MessageContent`**

Current call at the bottom of the component (line 130):
```tsx
<MessageContent content={displayContent} sessionId={sessionId} messageId={message.messageId} onStubbed={onStubbed}/>
```
Replace with:
```tsx
<MessageContent content={displayContent} sessionId={sessionId} messageId={message.messageId} onStubbed={onStubbed} toolUseMap={toolUseMap}/>
```

- [ ] **Step 3: Verify in dev server**

Still no visible change — `toolUseMap` is not yet passed from `ChatSessionView`. Confirm no TypeScript errors.

---

## Task 6: Build toolUseMap in ChatSessionView and inject it

**File:** `src/components/ChatSessionView.tsx`

There are two rendering paths:
- **Historical messages** → rendered via `MessageBubble` (line ~1077)
- **Live messages** → rendered with `MessageContent` directly (line ~1209)

- [ ] **Step 1: Add the `toolUseMap` useMemo — place it near the other memos, after `visibleHistoricalMessages` is defined**

```typescript
const toolUseMap = React.useMemo((): Map<string, ToolUseBlock> => {
    const map = new Map<string, ToolUseBlock>();
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

- [ ] **Step 2: Pass `toolUseMap` to the historical `MessageBubble` (line ~1077)**

Current:
```tsx
<MessageBubble
    message={message}
    index={index}
    sessionId={session?.sessionId}
    isSubAgentPrompt={isSubAgentPrompt}
    canEdit={isUser && !isChattingDisabled && editingId === null}
    onEdit={handleStartEdit}
    onRegenerate={!isUser && canRegenerate ? handleHistoricalRegenerate : undefined}
    onStubbed={handleStubbed}
    tts={tts}
/>
```
Replace with:
```tsx
<MessageBubble
    message={message}
    index={index}
    sessionId={session?.sessionId}
    isSubAgentPrompt={isSubAgentPrompt}
    canEdit={isUser && !isChattingDisabled && editingId === null}
    onEdit={handleStartEdit}
    onRegenerate={!isUser && canRegenerate ? handleHistoricalRegenerate : undefined}
    onStubbed={handleStubbed}
    tts={tts}
    toolUseMap={toolUseMap}
/>
```

- [ ] **Step 3: Pass `toolUseMap` to the live `MessageContent` (line ~1209)**

Current:
```tsx
<MessageContent content={message.content}/>
```
Replace with:
```tsx
<MessageContent content={message.content} toolUseMap={toolUseMap}/>
```

- [ ] **Step 4: Verify the full feature in dev server**

Open a historical session that has Edit, Write, and Read tool calls. Confirm:

**Edit tool:**
- `ToolCallBlock` header: `✎ Edited filename.ts +N-M` (collapsed by default)
- Click header → `DiffView` expands with red/green diff lines
- `ToolResultContentBlock`: green pill `✓ File edited` with stub button on hover

**Write tool:**
- `ToolCallBlock` header: `📄 Created filename.ts` (collapsed by default)
- Click header → all-green `DiffView` expands
- `ToolResultContentBlock`: green pill `✓ File created`

**Read tool:**
- `ToolCallBlock` header: `📖 Read filename.ts` (collapsed, JSON input when expanded — unchanged)
- `ToolResultContentBlock`: scrollable code block with `max-h-72`, own scrollbar, file content visible without expanding

**Other tools (Bash, etc.):**
- Unchanged from before

**Error case:**
- If you can find a session where an Edit/Write failed: pill shows red `✗ Error message`