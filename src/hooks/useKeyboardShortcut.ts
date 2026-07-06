"use client";

import React from "react";
import type {IShortcutOptions, IShortcutSpec, NavigatorWithUAData} from "@/types/keyboard";

// const IS_MAC: boolean = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const IS_MAC: boolean = typeof navigator !== 'undefined' && ((navigator as NavigatorWithUAData).userAgentData?.platform?.toLowerCase().includes('mac') ?? /mac/i.test(navigator.userAgent));

/** True when focus is in any text input (INPUT, TEXTAREA, or contenteditable). */
function isTextInputFocused(): boolean {
    const element: Element | null = document.activeElement;
    if (!element) {
        return false;
    }
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        return true;
    }
    return (element as HTMLElement).isContentEditable;
}

/**
 * Register a global keyboard shortcut. Cleans up on unmount.
 *
 * Uses `e.code` (physical key) rather than `e.key`, so Mac dead-keys like
 * `Option+N` → `˜` and `Option+,` → `≤` are matched by their physical key
 * regardless of the character produced.
 */
function useKeyboardShortcut(shortcutSpec: IShortcutSpec, callback: () => void, options?: IShortcutOptions): void {
    const callbackRef = React.useRef<() => void>(callback);
    const {code, mod, shift, alt} = shortcutSpec;

    const enabled: boolean = options?.enabled ?? true;
    const skipWhenTextInput: boolean = options?.skipWhenTextInput ?? false;

    React.useEffect((): void => {
        callbackRef.current = callback;
    }, [callback]);

    React.useEffect((): (() => void) | undefined => {
        if (!enabled) {
            return undefined;
        }

        const handler = (keyboardEvent: KeyboardEvent): void => {
            if (keyboardEvent.code !== code) {
                return;
            }
            const modPressed: boolean = IS_MAC ? keyboardEvent.metaKey : keyboardEvent.ctrlKey;
            if (!!mod !== modPressed) {
                return;
            }
            if (!!shift !== keyboardEvent.shiftKey) {
                return;
            }
            if (!!alt !== keyboardEvent.altKey) {
                return;
            }
            if (skipWhenTextInput && isTextInputFocused()) {
                return;
            }
            keyboardEvent.preventDefault();
            callbackRef.current();
        }

        document.addEventListener('keydown', handler);
        return (): void => {
            document.removeEventListener('keydown', handler);
        };
    }, [code, mod, shift, alt, enabled, skipWhenTextInput]);
}

export {useKeyboardShortcut};
