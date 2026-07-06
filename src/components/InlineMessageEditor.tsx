"use client";

import React from "react";
import {HiCheck, HiX} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IInlineMessageEditorProps} from "@/types/components";
import {useMarkdownShortcuts} from "@/hooks/useMarkdownShortcuts";

const MAX_TEXTAREA_HEIGHT: number = 200;

function InlineMessageEditor({initialText, disabled, onSave, onCancel}: IInlineMessageEditorProps) {
    const [text, setText] = React.useState<string>(initialText);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const handleChange = React.useCallback((changeEvent: React.ChangeEvent<HTMLTextAreaElement>): void => {
        setText(changeEvent.target.value);
        const textarea: HTMLTextAreaElement | null = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
        }
    }, []);

    const handleMarkdownKeyDown = useMarkdownShortcuts(textareaRef, text, setText);

    const handleKeyDown = React.useCallback((keyboardEvent: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (handleMarkdownKeyDown(keyboardEvent)) {
            requestAnimationFrame((): void => {
                const textarea: HTMLTextAreaElement | null = textareaRef.current;
                if (textarea) {
                    textarea.style.height = 'auto';
                    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
                }
            });
            return;
        }
        if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
            keyboardEvent.preventDefault();
            const trimmed: string = text.trim();
            if (trimmed && !disabled) onSave(trimmed);
        }
        if (keyboardEvent.key === 'Escape') {
            onCancel();
        }
    }, [handleMarkdownKeyDown, text, disabled, onSave, onCancel]);

    React.useEffect(() => {
        const textarea: HTMLTextAreaElement | null = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        const len: number = textarea.value.length;
        textarea.setSelectionRange(len, len);
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    }, []);

    const canSave: boolean = text.trim().length > 0 && !disabled;

    return (
        <div className={'flex flex-col gap-2 w-full max-w-[85%] ml-auto'}>
            <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                rows={1}
                className={cn(
                    'w-full resize-none rounded-xl border-2 border-primary bg-user-bubble px-4 py-3 text-sm text-text',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'overflow-y-auto',
                )}
                style={{maxHeight: `${MAX_TEXTAREA_HEIGHT}px`}}
            />
            <div className={'flex items-center gap-2 justify-end'}>
                <Button variant={'ghost'} size={'sm'} disabled={disabled} className={'active:bg-transparent hover:bg-transparent'} onClick={onCancel}>
                    <HiX className={'size-3.5'}/>
                    Cancel
                </Button>
                <Button variant={'primary'} size={'sm'} disabled={!canSave} isLoading={disabled} onClick={() => {
                    const trimmedText: string = text.trim();
                    if (trimmedText) onSave(trimmedText);
                }}>
                    <HiCheck className={'size-3.5'}/>
                    Save
                </Button>
            </div>
        </div>
    );
}

export {InlineMessageEditor};
