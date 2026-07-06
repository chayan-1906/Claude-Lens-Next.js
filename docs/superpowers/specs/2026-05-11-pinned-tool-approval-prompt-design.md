# Pinned ToolApprovalPrompt — Design

## Context

`ToolApprovalPrompt` currently renders **inline as the last item in the chat
message stream** (`ChatSessionView.tsx:1432-1435`). When Claude requests a tool
call and the hook is awaiting a user decision, the card appears as a
bubble-like element in the conversation. If the user scrolls up to read
history, the prompt scrolls away with the chat.

Inspired by Claude Code Remote Control, we want the approval card pinned at
the bottom of the viewport — directly above the `ChatInput` — so it is always
visible while a decision is pending.

## Goals

- Pinned approval card overlays the bottom of the chat area, above `ChatInput`.
- Card width matches `ChatInput` (`max-w-4xl lg:max-w-6xl`, centered, `px-6`).
- Chat history scrolls **behind** the card. The user can scroll manually to
  bring any message — including the most recent — fully into view above the
  card.
- No auto-scroll behavior on card appear/disappear (current scroll position is
  preserved).
- All existing approve / allow-all / deny / keyboard-shortcut behavior is
  preserved exactly.

## Non-goals

- No changes to `ToolApprovalPrompt`'s internal interaction model (buttons,
  deny-reason textarea, allow-all confirmation modal, keyboard shortcuts).
- No changes to the WebSocket / `useClaudeChat` approval data flow
  (`pendingApproval`, `handleApprovalResponse`).
- No changes to read-only historical session views — approvals are a
  live-chat-only concept.

## Design

### 1. Remove the inline render

Delete the block at `ChatSessionView.tsx:1432-1435`:

```tsx
{/* Tool approval prompt — shown inline when hook is waiting for user decision */}
{pendingApproval && (
    <ToolApprovalPrompt approval={pendingApproval} projectDir={projectDir} onRespond={handleApprovalResponse}/>
)}
```

### 2. Add a pinned container above `ChatInput`

Insert a new wrapper directly above the existing `ChatInput` wrapper (around
line 1466). It mirrors the input's centering and max-width so the pinned card
visually clusters with the input as a unified bottom UI region. Render only
when `pendingApproval` is set.

```tsx
{pendingApproval && (
    <div ref={approvalRef} className={'w-full max-w-4xl lg:max-w-6xl mx-auto px-6 mb-3'}>
        <ToolApprovalPrompt approval={pendingApproval} projectDir={projectDir} onRespond={handleApprovalResponse}/>
    </div>
)}
```

### 3. Dynamic scroll padding (ResizeObserver)

So the user can scroll the chat behind the floating card and still read the
most recent message:

- Add `approvalRef` (React ref to the pinned container).
- Track `approvalHeight: number` in component state (default `0`).
- Attach a `ResizeObserver` to `approvalRef.current` that updates
  `approvalHeight` on mount and on any size change (handles the deny-reason
  textarea expanding/collapsing inside the card).
- Apply the measured height as `padding-bottom` to the messages scroll
  container (the scrollable parent of the message list):

  ```tsx
  style={{paddingBottom: approvalHeight + 12}}
  ```

- When `pendingApproval` becomes `null`, the container unmounts; cleanup
  resets `approvalHeight` to `0`, restoring normal padding.

### 4. Offset the "Scroll to bottom" button

The existing floating button at `ChatSessionView.tsx:1453-1458` is positioned
`absolute bottom-4 right-6`. Lift it by `approvalHeight` so it never slides
behind the card:

```tsx
style={{bottom: 16 + approvalHeight}}
```

(Drop the `bottom-4` Tailwind class in favor of the inline style, or keep the
class and add `marginBottom: approvalHeight`.)

### 5. Trim the prompt's outer wrapper

In `ToolApprovalPrompt.tsx`:

- Remove the outer `<div className={'flex flex-col items-start w-full'}>`
  wrapper — alignment is now the parent's responsibility.
- Remove `max-w-[85%]` from the card root — width is now controlled by the
  new pinned container (`max-w-4xl lg:max-w-6xl`).
- Keep all inner styling (colors, header, content rendering, action buttons,
  allow-all modal) unchanged.

## Data flow

Unchanged. `useClaudeChat` continues to emit `pendingApproval` and
`handleApprovalResponse`; only the render location moves.

## Testing checklist

- Live tool-call: card appears pinned above input, not inline in the stream.
- Manual scroll: user can scroll the chat to fully reveal the most recent
  message above the floating card.
- Deny-reason textarea: opening/closing it changes card height; scroll
  padding updates without a scroll jump.
- Dismissal (approve / allow-all / deny): scroll padding returns to zero;
  "Scroll to bottom" button returns to its base position.
- Sequential approvals (multiple tool calls in one turn): padding tracks
  correctly across re-renders.
- Mobile / narrow viewport: card respects `px-6` and doesn't overflow.
- Keyboard shortcuts (`⌘↵`, `⌘⇧↵`, `⌘⌫`) still work.

## Risk

Low. The change is one render-site relocation plus a small `ResizeObserver`
hook. All approval interaction logic is untouched.