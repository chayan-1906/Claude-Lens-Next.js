# Keyboard Shortcuts — Design

**Date:** 2026-05-10
**Status:** Pending user review
**Source idea:** [Notion page](https://www.notion.so/3540c0271722802ca374def3173ec1b0)

## Goals

Add a small, opinionated set of keyboard shortcuts to make Claude Lens feel like a power-user tool. Focus on:

- Actions users perform most (open search, toggle sidebar, accept/reject tool calls)
- Conventions familiar from Linear / Slack / ChatGPT / VS Code (zero learning curve for power users)
- Zero conflicts with browser-reserved or text-input-native shortcuts

## Non-goals

- Comprehensive shortcut coverage for every action
- Customizable / user-configurable shortcuts
- Help modal or visual `kbd` hints (deferred — see *Future enhancements*)

## Final shortcut set

| Action                                                 | Shortcut (Mac / Win)       | Status                                                                                |
|--------------------------------------------------------|----------------------------|---------------------------------------------------------------------------------------|
| Open / toggle global search                            | `⌘K` / `Ctrl+K`            | New                                                                                   |
| New chat / session                                     | `⌥N` / `Alt+N`             | Already shipped (`AppLayout.tsx:67`) — refactor only                                  |
| Toggle sidebar (collapse on desktop, drawer on mobile) | `⌘\` / `Ctrl+\`            | New                                                                                   |
| Approve tool call                                      | `⌘↵` / `Ctrl+Enter`        | New — only when a prompt is visible                                                   |
| Allow All tool call                                    | `⌘⇧↵` / `Ctrl+Shift+Enter` | New — only when a prompt is visible (opens the existing confirmation modal)           |
| Deny tool call                                         | `⌘⌫` / `Ctrl+Backspace`    | New — only when prompt is visible AND no text input focused (opens the deny textarea) |
| Confirm deny (in deny textarea)                        | `Enter`                    | Already wired (`ToolApprovalPrompt.tsx:84`) — no change                               |
| Cancel deny (in deny textarea)                         | `Esc`                      | Already wired (`ToolApprovalPrompt.tsx:87`) — no change                               |

## Architecture

### `useKeyboardShortcut` hook

A thin reusable hook that:

1. Registers a `keydown` listener on `document` when mounted
2. Matches a chord spec using `e.code` (physical key, not character)
3. Optionally skips when a text input is focused
4. Calls the callback if all conditions match
5. Cleans up on unmount

Signature:

```ts
type ShortcutSpec = {
    code: string;       // KeyboardEvent.code (e.g., 'KeyK', 'Backslash', 'Backspace', 'Enter')
    mod?: boolean;      // Cmd on Mac, Ctrl on Windows/Linux
    shift?: boolean;
    alt?: boolean;      // Option on Mac
};

type ShortcutOptions = {
    enabled?: boolean;            // default: true
    skipWhenTextInput?: boolean;  // default: false
};

function useKeyboardShortcut(
    spec: ShortcutSpec,
    callback: () => void,
    options?: ShortcutOptions,
): void;
```

**Why `e.code` (physical key) instead of `e.key` (character)?**
On Mac, `Option+N` produces the dead-key character `˜`, `Option+,` produces `≤`, etc. Using `e.code` matches the physical key regardless of the character emitted. This is already the pattern used in `AppLayout.tsx:68`.

**Cross-platform `mod` flag:**
`mod: true` resolves to `e.metaKey` on Mac and `e.ctrlKey` on Windows/Linux, detected once via `navigator.platform`. This avoids repeating platform branches in every consumer.

### `isTextInputFocused` helper

For shortcuts where native text-input behavior must NOT be overridden (specifically `⌘⌫`):

```ts
function isTextInputFocused(): boolean {
    const el: Element | null = document.activeElement;
    if (!el) return false;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
    if ((el as HTMLElement).isContentEditable) return true;
    return false;
}
```

Lives in the same file as the hook (no other consumers anticipated).

### Multi-prompt handling — not needed

Investigation: `useClaudeChat.ts:49` exposes `pendingApproval` as a single value (`approvalQueue[0] ?? null`), and `ChatSessionView.tsx:1373` renders exactly one `ToolApprovalPrompt` at a time. The hook lifecycle (mount/unmount) naturally aligns with prompt visibility — no `isActive` prop required.

### Sidebar toggle — desktop vs mobile branching

`AppLayout` has two sidebar states:

- **Desktop:** `isCollapsed` (animates width to 0)
- **Mobile:** `sidebarOpen` (slides drawer in/out)

The `⌘\` handler branches on the existing `isMobile` flag and toggles the appropriate state.

### Search toggle behavior

`⌘K` toggles `isSearchOpen` in `AppLayout`. The modal already handles `Esc` for close (`SearchModal.tsx:84`); the global `⌘K` listener also closes via toggle. No internal binding needed inside the modal.

## Files to create / modify

### Create

- `project/src/hooks/useKeyboardShortcut.ts` — the hook + `isTextInputFocused` helper
- `project/src/types/keyboard.ts` — `ShortcutSpec`, `ShortcutOptions` types (3-section file structure per CLAUDE.md)

### Modify

- `project/src/components/layouts/AppLayout.tsx`
  - Refactor existing `Option+N` inline `useEffect` (lines 66–75) to use the new hook
  - Add `⌘K` (toggle search) and `⌘\` (toggle sidebar)
- `project/src/components/ToolApprovalPrompt.tsx`
  - Add `⌘↵` → calls `handleApprove`, with `{ enabled: !showDenyInput }`
  - Add `⌘⇧↵` → calls `handleAllowAllClick` (opens the existing confirmation modal — same as the button), with `{ enabled: !showDenyInput }`
  - Add `⌘⌫` → calls `handleDenyClick` (opens the deny textarea — same as the button), with `{ skipWhenTextInput: true }`

**Why the asymmetric gating:**
The Approve / Allow-All shortcuts are gated on `!showDenyInput` (not `skipWhenTextInput`) so that `⌘↵` still works as a quick-approve when the user is typing in `ChatInput`. But once the deny textarea is open, the user is committed to the deny flow — `⌘↵` (intuitively "submit my deny reason") must NOT silently flip the action to Approve. Same for `⌘⇧↵`.

The Deny shortcut uses `skipWhenTextInput: true` because its keystroke (`⌘⌫`) has native macOS behavior in text inputs (delete line) that must be preserved everywhere.

## Edge cases

| Case                                                      | Behavior                                                                                                                                                           |
|-----------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `⌘K` while search modal already open                      | Toggles closed                                                                                                                                                     |
| `⌘\` on mobile                                            | Toggles drawer (`sidebarOpen`)                                                                                                                                     |
| `⌘\` on desktop                                           | Toggles collapse (`isCollapsed`)                                                                                                                                   |
| `⌘⌫` while typing in `ChatInput`                          | Native macOS delete-line — not captured (`skipWhenTextInput`)                                                                                                      |
| `⌘⌫` while typing in deny textarea                        | Native macOS delete-line — not captured (`skipWhenTextInput`)                                                                                                      |
| `⌘⌫` when no prompt visible                               | No-op — hook isn't mounted                                                                                                                                         |
| `⌘↵` while typing in `ChatInput` (no deny textarea open)  | Triggers Approve. `ChatInput` does not bind `Cmd+Enter`, so this is a clean override.                                                                              |
| `⌘↵` while deny textarea is open                          | Does NOT fire (`enabled: !showDenyInput`). The user is mid-deny — flipping to Approve would be catastrophic. The textarea's own `Enter` handler confirms the deny. |
| `⌘⇧↵` while typing in `ChatInput` (no deny textarea open) | Triggers Allow-All confirmation modal — same logic as `⌘↵`                                                                                                         |
| `⌘⇧↵` while deny textarea is open                         | Does NOT fire — same reason as `⌘↵`                                                                                                                                |
| Multiple ToolApprovalPrompts                              | Cannot occur — only one is rendered (see *Multi-prompt handling*)                                                                                                  |
| Browser shortcut conflicts                                | None for the chosen set: `⌘K`, `⌘\`, `⌘↵`, `⌘⇧↵`, `⌘⌫` are unbound in Chrome / Safari / Firefox at the page level                                                  |

## Style / conventions

- Project style rules apply throughout (single quotes for strings, `export` at bottom of file, TypeScript types on every declaration)
- New types file follows the 3-section convention from CLAUDE.md (Constants and Type Aliases / API response types / function params)
- No new dependencies introduced
- No backend changes — pure frontend feature

## Future enhancements (explicitly out of scope for v1)

- **Inline `kbd` chips on action buttons** — show `⌘↵` next to "Approve", `⌘⇧↵` next to "Allow All", etc. Self-documenting discoverability without a help modal. *Recommended next step after v1 ships.*
- **Help modal** — `?` or `⌘/` to show all shortcuts. Useful but explicitly deferred.
- **Settings shortcut** — low priority; user explicitly opted out.
- **User-customizable shortcuts** — out of scope.

## Sticky `ToolApprovalPrompt` (separate task — not in scope)

The same Notion page mentions making `ToolApprovalPrompt` sticky with `ChatInput` (not scrollable with the session). This is a layout change, not a keyboard-shortcuts change, and is being tracked as a separate task.