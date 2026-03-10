"use client";

import React from "react";
import {HiOutlineArrowUp} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IChatInputProps} from "@/types/components";

function ChatInput({onSend, isStreaming, isOnline}: IChatInputProps) {
    const [text, setText] = React.useState<string>('');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleSubmit = React.useCallback((): void => {
        if (!text.trim() || isStreaming || !isOnline) return;
        onSend(text.trim());
        setText('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    }, [text, isStreaming, isOnline, onSend]);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        // Enter to send, Shift+Enter for newline
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    }, [handleSubmit]);

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

    // Auto-resize textarea as user types (max ~200px)
    React.useEffect(() => {
        const el: HTMLTextAreaElement | null = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 200) + 'px';
        }
    }, [text]);

    const isDisabled: boolean = !text.trim() || isStreaming || !isOnline;

    return (
        <div className={'border-t border-border bg-surface p-4'}>
            <div className={'max-w-3xl mx-auto flex items-end gap-2'}>
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isOnline ? 'Message Claude...' : 'Backend offline — read-only mode'}
                    disabled={!isOnline}
                    rows={1}
                    className={cn(
                        'flex-1 resize-none rounded-xl border border-border px-4 py-3',
                        'bg-background text-text text-sm leading-relaxed',
                        'focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
                        'disabled:bg-surface disabled:text-text-muted disabled:cursor-not-allowed',
                        'placeholder:text-text-muted',
                    )}
                />
                <Button variant={'primary'} size={'icon'} onClick={handleSubmit} disabled={isDisabled} className={'shrink-0 size-11 rounded-xl'}>
                    {isStreaming ? (
                        <svg className={'size-5 animate-spin'} viewBox={'0 0 24 24'} fill={'none'}>
                            <circle className={'opacity-25'} cx={'12'} cy={'12'} r={'10'} stroke={'currentColor'} strokeWidth={'4'}/>
                            <path className={'opacity-75'} fill={'currentColor'} d={'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'}/>
                        </svg>
                    ) : (
                        <HiOutlineArrowUp className={'size-5'}/>
                    )}
                </Button>
            </div>
            <div className={'max-w-3xl mx-auto mt-1 text-xs text-text-muted'}>
                Shift+Enter for new line
            </div>
        </div>
    );
}

export {ChatInput};
