"use client";

import React from "react";
import {HiArrowUp} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IChatInputProps} from "@/types/components";

const MAX_TEXTAREA_HEIGHT: number = 200;

function ChatInput({onSend, disabled, isLoading}: IChatInputProps) {
    const [text, setText] = React.useState<string>('');
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const adjustHeight = React.useCallback((): void => {
        const textarea: HTMLTextAreaElement | null = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    }, []);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>): void => {
        setText(e.target.value);
        adjustHeight();
    }, [adjustHeight]);

    const handleSend = React.useCallback((): void => {
        const trimmed: string = text.trim();
        if (!trimmed || disabled) {
            console.log(`[ChatInput] handleSend blocked — empty: ${!trimmed}, disabled: ${disabled}`);
            return;
        }
        console.log(`[ChatInput] Sending: "${trimmed.slice(0, 50)}..."`);
        onSend(trimmed);
        setText('');
        const textarea: HTMLTextAreaElement | null = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
        }
    }, [text, disabled, onSend]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            console.log('[ChatInput] Enter pressed (sending)!');
            handleSend();
        }
    }, [handleSend]);

    // Capture keystrokes anywhere on the page and redirect to textarea
    React.useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent): void => {
            // Skip if already focused on an input/textarea, or if modifier keys are held (except Shift)
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            // Only capture printable characters (single char keys or space)
            if (e.key.length !== 1) return;

            textareaRef.current?.focus();
        };
        document.addEventListener('keydown', handleGlobalKeyDown);
        return (): void => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, []);

    React.useEffect(() => {
        if (!disabled) {
            textareaRef.current?.focus();
        }
    }, [disabled]);

    const canSend: boolean = text.trim().length > 0 && !disabled;

    return (
        <div className={'flex items-end gap-2 p-3 rounded-t-xl border-x border-t border-border bg-surface'}>
            <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                placeholder={'Send a message...'}
                rows={1}
                className={cn(
                    'flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text-muted',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'overflow-y-auto',
                )}
                style={{maxHeight: `${MAX_TEXTAREA_HEIGHT}px`}}
            />
            <Button variant={'primary'} size={'icon'} onClick={handleSend} disabled={!canSend} isLoading={isLoading} className={'shrink-0 size-9 rounded-lg'}>
                {!isLoading && <HiArrowUp className={'size-4'}/>}
            </Button>
        </div>
    );
}

export {ChatInput};
