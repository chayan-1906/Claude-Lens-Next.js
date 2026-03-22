"use client";

import React from "react";
import {FaSquare} from "react-icons/fa";
import {HiArrowUp, HiOutlinePlus} from "react-icons/hi";
import {ImSpinner2} from "react-icons/im";
import {FaMicrophone} from "react-icons/fa6";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import {ModelSelector} from "@/components/ModelSelector";
import {useVoiceInput} from "@/hooks/useVoiceInput";
import type {IChatInputProps} from "@/types/components";
import {useMarkdownShortcuts} from "@/hooks/useMarkdownShortcuts";

const MAX_TEXTAREA_HEIGHT: number = 200;
const WAVE_DELAYS: number[] = [0, 0.1, 0.2, 0.1, 0];

// Module-level draft — survives component remount (e.g. /c/new → /c/[sessionId] server re-render)
let draftText: string = '';

function ChatInput({onSend, onStop, disabled, isLoading, selectedModel, selectedEffort, onModelChange, onEffortChange}: IChatInputProps) {
    const [text, setText] = React.useState<string>(draftText);
    const [isStopping, setIsStopping] = React.useState<boolean>(false);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    const {state: voiceState, isSpeaking, liveTranscript, transcript, rephrased, errorMessage, startRecording, stopRecording, reset: resetVoice} = useVoiceInput();

    const isRecording: boolean = voiceState === 'recording';
    const isVoiceProcessing: boolean = voiceState === 'processing';

    const adjustHeight = React.useCallback((): void => {
        const textarea: HTMLTextAreaElement | null = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
    }, []);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>): void => {
        const value: string = e.target.value;
        setText(value);
        draftText = value;
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
        draftText = '';
        resetVoice();
        const textarea: HTMLTextAreaElement | null = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
        }
    }, [text, disabled, onSend, resetVoice]);

    const handleMarkdownKeyDown = useMarkdownShortcuts(textareaRef, text, setText);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (handleMarkdownKeyDown(e)) {
            requestAnimationFrame(adjustHeight);
            return;
        }
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift+Enter — browser natively inserts newline, just let it through
                return;
            }
            if (e.metaKey || e.ctrlKey || e.altKey) {
                // Cmd/Ctrl/Alt+Enter — manually insert newline (browser doesn't do this natively)
                e.preventDefault();
                const textarea: HTMLTextAreaElement = e.currentTarget;
                const start: number = textarea.selectionStart;
                const end: number = textarea.selectionEnd;
                const newValue: string = text.slice(0, start) + '\n' + text.slice(end);
                setText(newValue);
                draftText = newValue;
                requestAnimationFrame((): void => {
                    textarea.selectionStart = start + 1;
                    textarea.selectionEnd = start + 1;
                    adjustHeight();
                });
                return;
            }
            // Bare Enter — send message
            e.preventDefault();
            console.log('[ChatInput] Enter pressed (sending)!');
            handleSend();
        }
    }, [handleMarkdownKeyDown, adjustHeight, handleSend, text]);

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
        if (!disabled && textareaRef.current) {
            const el: HTMLTextAreaElement = textareaRef.current;
            el.focus();
            el.selectionStart = el.value.length;
            el.selectionEnd = el.value.length;
        }
    }, [disabled]);

    const handleStop = React.useCallback((): void => {
        if (isStopping) return;
        setIsStopping(true);
        onStop();
    }, [isStopping, onStop]);

    // Reset isStopping when loading finishes (process stopped or completed)
    React.useEffect(() => {
        if (!isLoading) {
            setIsStopping(false);
        }
    }, [isLoading]);

    // Insert rephrased text into textarea when voice transcription completes
    React.useEffect(() => {
        if (voiceState === 'done' && rephrased) {
            setText(rephrased);
            draftText = rephrased;
            requestAnimationFrame(adjustHeight);
            textareaRef.current?.focus();
        }
    }, [voiceState, rephrased, adjustHeight]);

    const handleMicClick = React.useCallback(async (): Promise<void> => {
        if (isVoiceProcessing) return;
        if (isRecording) {
            stopRecording();
            return;
        }
        resetVoice();
        await startRecording();
    }, [isVoiceProcessing, isRecording, stopRecording, resetVoice, startRecording]);

    const canSend: boolean = text.trim().length > 0 && !disabled && !isRecording;

    // Single action button — one of: Stop stream | Voice spinner | Stop recording | Send | Mic
    const renderActionButton = (): React.ReactElement => {
        if (isLoading) {
            return (
                <Button variant={'primary'} size={'icon'} onClick={handleStop} disabled={isStopping} className={'shrink-0 size-8 rounded-lg'}>
                    <FaSquare className={'size-3'}/>
                </Button>
            );
        }
        if (isVoiceProcessing) {
            return (
                <Button variant={'ghost'} size={'icon'} disabled className={'shrink-0 size-8 rounded-lg'}>
                    <ImSpinner2 className={'size-4 animate-spin'}/>
                </Button>
            );
        }
        if (isRecording) {
            return (
                <div className={'relative flex items-center justify-center shrink-0'}>
                    <span className={'absolute inline-flex size-8 rounded-lg bg-error opacity-25 animate-ping'}/>
                    <Button variant={'danger'} size={'icon'} onClick={handleMicClick} className={'relative z-10 size-8 rounded-lg'}>
                        <FaMicrophone className={'size-3.5'}/>
                    </Button>
                </div>
            );
        }
        if (canSend) {
            return (
                <Button variant={'primary'} size={'icon'} onClick={handleSend} className={'shrink-0 size-8 rounded-lg'}>
                    <HiArrowUp className={'size-4'}/>
                </Button>
            );
        }
        // Default: idle mic
        return (
            <Button variant={'ghost'} size={'icon'} onClick={handleMicClick} disabled={disabled} aria-label={'Start recording'} className={'shrink-0 size-8 rounded-lg'}>
                <FaMicrophone className={'size-3.5'}/>
            </Button>
        );
    };

    return (
        <div className={'flex flex-col rounded-t-xl border-x border-t border-border bg-surface'}>
            {/* Voice recording overlay: live transcript + wave bars */}
            {(isRecording || isVoiceProcessing) && (
                <div className={'px-3 pt-3 pb-1 space-y-2'}>
                    {/* Live transcript */}
                    <div className={'min-h-8 px-3 py-2 rounded-lg bg-background border border-border'}>
                        {isRecording && liveTranscript ? (
                            <p className={'text-sm text-text-muted italic leading-relaxed'}>{liveTranscript}</p>
                        ) : isRecording ? (
                            <p className={'text-sm text-text-muted italic'}>Listening...</p>
                        ) : (
                            <p className={'text-sm text-text-muted italic'}>Processing your audio...</p>
                        )}
                    </div>
                    {/* Wave bars — voice activity indicator */}
                    {isRecording && (
                        <div className={'flex gap-0.75 items-end justify-center h-6'}>
                            {WAVE_DELAYS.map((delay: number, i: number) => (
                                <span
                                    key={i}
                                    className={'block w-1.5 rounded-full bg-error'}
                                    style={{
                                        height: '4px',
                                        animationName: isSpeaking ? 'wave-bar' : 'none',
                                        animationDuration: '0.5s',
                                        animationTimingFunction: 'ease-in-out',
                                        animationIterationCount: 'infinite',
                                        animationDirection: 'alternate',
                                        animationDelay: `${delay}s`,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Voice error message */}
            {voiceState === 'error' && errorMessage && (
                <div className={'px-3 pt-3 pb-1'}>
                    <p className={'text-xs text-error'}>{errorMessage}</p>
                </div>
            )}

            {/* Voice transcription result: raw vs rephrased */}
            {voiceState === 'done' && transcript && (
                <div className={'px-3 pt-3 pb-1'}>
                    <div className={'grid grid-cols-2 gap-2'}>
                        <div>
                            <p className={'text-[10px] font-medium text-text-muted uppercase tracking-widest mb-1'}>Raw Transcript</p>
                            <div className={'bg-background rounded-lg px-3 py-2 text-xs text-text-muted leading-relaxed border border-border'}>{transcript}</div>
                        </div>
                        <div>
                            <p className={'text-[10px] font-medium text-text-muted uppercase tracking-widest mb-1'}>Rephrased</p>
                            <div className={'bg-background rounded-lg px-3 py-2 text-xs text-text leading-relaxed border border-border'}>{rephrased}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Textarea */}
            <div className={'px-3 pt-3'}>
                <textarea
                    ref={textareaRef}
                    value={text}
                    inputMode={'text'}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    disabled={isRecording || isVoiceProcessing}
                    placeholder={'Send a message...'}
                    className={cn(
                        'w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text font-medium placeholder:text-text-muted',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'overflow-y-auto max-h-64',
                    )}
                />
            </div>

            {/* Bottom toolbar: [+] left | [ModelSelector] [ActionButton] right */}
            <div className={'flex items-center justify-between px-3 py-2'}>
                {/* Left: plus icon (placeholder for future attachments) */}
                <Button variant={'ghost'} size={'icon'} disabled className={'size-7 rounded-lg opacity-40'} aria-label={'Add attachment'}>
                    <HiOutlinePlus className={'size-4'}/>
                </Button>

                {/* Right: model + effort selectors + action button */}
                <div className={'flex items-center gap-2'}>
                    <ModelSelector
                        selectedModel={selectedModel}
                        selectedEffort={selectedEffort}
                        onModelChange={onModelChange}
                        onEffortChange={onEffortChange}
                        disabled={isLoading}
                    />
                    {renderActionButton()}
                </div>
            </div>
        </div>
    );
}

export {ChatInput};
