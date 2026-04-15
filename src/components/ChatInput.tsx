"use client";

import React from "react";
import Image from "next/image";
import {FaSquare} from "react-icons/fa";
import {ImSpinner2} from "react-icons/im";
import {FaMicrophone} from "react-icons/fa6";
import {HiArrowUp, HiOutlineDocument, HiOutlinePhotograph, HiOutlinePlus, HiX} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {IAttachment} from "@/types/chat";
import {Button} from "@/components/ui/Button";
import {ModelSelector} from "@/components/ModelSelector";
import {useVoiceInput} from "@/hooks/useVoiceInput";
import type {IChatInputProps} from "@/types/components";
import {useMarkdownShortcuts} from "@/hooks/useMarkdownShortcuts";

const MAX_TEXTAREA_HEIGHT: number = 200;
const MAX_FILE_SIZE_BYTES: number = 10 * 1024 * 1024; // 10MB per file
const MAX_ATTACHMENTS: number = 5;
const WAVE_DELAYS: number[] = [0, 0.1, 0.2, 0.1, 0];

/** HEIC/HEIF MIME types — browsers cannot render these natively */
const HEIC_MIME_TYPES: Set<string> = new Set(['image/heic', 'image/heif']);

/** MIME types accepted by the file picker */
const ACCEPTED_FILE_TYPES: string = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', '.heic', '.heif',
    'application/pdf',
    'text/*',
    // Common code file extensions (browser falls back to extension matching when MIME is unknown)
    '.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
    '.java', '.kt', '.swift', '.sh', '.bash', '.zsh', '.yml', '.yaml', '.json', '.xml',
    '.html', '.css', '.scss', '.less', '.sql', '.md', '.txt', '.csv', '.log', '.env',
    '.toml', '.ini', '.cfg', '.conf',
].join(',');

const MAX_IMAGE_DIMENSION: number = 2000;
const JPEG_QUALITY: number = 0.85;

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Resize image to ≤2000px and re-encode as JPEG — mirrors Claude CLI's own image preprocessing */
async function resizeAndCompressImage(base64: string, mimeType: string): Promise<{base64: string; mimeType: string; size: number}> {
    return new Promise((resolve): void => {
        const img = new window.Image();
        img.onload = (): void => {
            const {width, height} = img;
            const scale: number = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));
            const newWidth: number = Math.round(width * scale);
            const newHeight: number = Math.round(height * scale);
            const canvas: HTMLCanvasElement = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
            if (!ctx) {
                resolve({base64, mimeType, size: Math.ceil(base64.length * 0.75)});
                return;
            }
            // White background handles PNG transparency when converting to JPEG
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, newWidth, newHeight);
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            const outputMimeType: string = 'image/jpeg';
            const dataUrl: string = canvas.toDataURL(outputMimeType, JPEG_QUALITY);
            const outputBase64: string = dataUrl.split(',')[1] ?? '';
            const outputSize: number = Math.ceil(outputBase64.length * 0.75);
            resolve({base64: outputBase64, mimeType: outputMimeType, size: outputSize});
        };
        img.onerror = (): void => {
            // Decoding failed — pass through unchanged
            resolve({base64, mimeType, size: Math.ceil(base64.length * 0.75)});
        };
        img.src = `data:${mimeType};base64,${base64}`;
    });
}

// Module-level draft — survives component remount (e.g. /c/new → /c/[sessionId] server re-render)
let draftText: string = '';

function ChatInput({onSend, onStop, disabled, isLoading, selectedModel, selectedEffort, thinking, onModelChange, onEffortChange, onThinkingChange, ideStatus, r2Configured, groqConfigured}: IChatInputProps) {
    const [text, setText] = React.useState<string>(draftText);
    const [isStopping, setIsStopping] = React.useState<boolean>(false);
    const [attachments, setAttachments] = React.useState<IAttachment[]>([]);
    const [isDragOver, setIsDragOver] = React.useState<boolean>(false);
    const [attachmentError, setAttachmentError] = React.useState<string | null>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const dragCounterRef = React.useRef<number>(0);

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

    // --- Attachment processing ---

    const processFiles = React.useCallback(async (files: FileList | File[]): Promise<void> => {
        const fileArray: File[] = Array.from(files);
        setAttachmentError(null);

        // Check total count (existing + new)
        const remaining: number = MAX_ATTACHMENTS - attachments.length;
        if (remaining <= 0) {
            setAttachmentError(`Maximum ${MAX_ATTACHMENTS} attachments per message`);
            return;
        }
        const filesToProcess: File[] = fileArray.slice(0, remaining);
        if (filesToProcess.length < fileArray.length) {
            setAttachmentError(`Only ${remaining} more attachment(s) allowed (max ${MAX_ATTACHMENTS})`);
        }

        const newAttachments: IAttachment[] = [];
        for (const file of filesToProcess) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                setAttachmentError(`${file.name} exceeds 10 MB limit`);
                continue;
            }

            const rawBase64: string = await new Promise<string>((resolve, reject) => {
                const reader: FileReader = new FileReader();
                reader.onload = (): void => {
                    const result: string = reader.result as string;
                    // Strip data URL prefix (data:mime;base64,) — backend expects raw base64
                    const base64Data: string = result.split(',')[1] ?? '';
                    resolve(base64Data);
                };
                reader.onerror = (): void => reject(reader.error);
                reader.readAsDataURL(file);
            });

            const fileMimeType: string = file.type || 'application/octet-stream';
            const isResizableImage: boolean = fileMimeType.startsWith('image/') && !HEIC_MIME_TYPES.has(fileMimeType);
            const {base64, mimeType, size} = isResizableImage
                ? await resizeAndCompressImage(rawBase64, fileMimeType)
                : {base64: rawBase64, mimeType: fileMimeType, size: file.size};

            newAttachments.push({
                name: file.name,
                mimeType,
                data: base64,
                size,
            });
        }

        if (newAttachments.length > 0) {
            setAttachments((prev: IAttachment[]) => [...prev, ...newAttachments]);
        }
    }, [attachments.length]);

    const removeAttachment = React.useCallback((index: number): void => {
        setAttachments((prev: IAttachment[]) => prev.filter((_: IAttachment, i: number) => i !== index));
        setAttachmentError(null);
    }, []);

    const handleAttachClick = React.useCallback((): void => {
        fileInputRef.current?.click();
    }, []);

    const handleFileInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
        if (e.target.files && e.target.files.length > 0) {
            processFiles(e.target.files);
        }
        // Reset value so the same file can be selected again
        e.target.value = '';
    }, [processFiles]);

    // --- Drag and drop ---

    const handleDragEnter = React.useCallback((e: React.DragEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current++;
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragOver(true);
        }
    }, []);

    const handleDragLeave = React.useCallback((e: React.DragEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current--;
        if (dragCounterRef.current === 0) {
            setIsDragOver(false);
        }
    }, []);

    const handleDragOver = React.useCallback((e: React.DragEvent): void => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = React.useCallback((e: React.DragEvent): void => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragOver(false);
        const files: File[] = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            processFiles(files);
        }
    }, [processFiles]);

    // --- Paste handler (images from clipboard) ---

    const handlePaste = React.useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>): void => {
        const files: File[] = Array.from(e.clipboardData.files);
        if (files.length > 0) {
            e.preventDefault();
            processFiles(files);
        }
    }, [processFiles]);

    // --- Send / stop ---

    const handleSend = React.useCallback((): void => {
        const trimmed: string = text.trim();
        const hasAttachments: boolean = attachments.length > 0;
        if ((!trimmed && !hasAttachments) || disabled || !r2Configured) {
            console.log(`[ChatInput] handleSend blocked — empty: ${!trimmed}, noAttachments: ${!hasAttachments}, disabled: ${disabled}, r2Configured: ${r2Configured}`);
            return;
        }
        console.log(`[ChatInput] Sending: "${trimmed.slice(0, 50)}..." with ${attachments.length} attachment(s)`);
        onSend(trimmed, hasAttachments ? attachments : undefined);
        setText('');
        draftText = '';
        setAttachments([]);
        setAttachmentError(null);
        resetVoice();
        const textarea: HTMLTextAreaElement | null = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
        }
    }, [text, attachments, disabled, r2Configured, onSend, resetVoice]);

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
        if (!disabled && r2Configured && textareaRef.current) {
            const el: HTMLTextAreaElement = textareaRef.current;
            el.focus();
            el.selectionStart = el.value.length;
            el.selectionEnd = el.value.length;
        }
    }, [disabled, r2Configured]);

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

    const r2Disabled: boolean = !r2Configured;
    const micDisabled: boolean = !groqConfigured;
    const effectiveDisabled: boolean = disabled || r2Disabled;
    const canSend: boolean = text.trim().length > 0 && !effectiveDisabled && !isRecording;
    const r2Tooltip: string | undefined = r2Disabled ? 'Please configure Cloudflare R2 in Setup to start chatting' : undefined;
    const micTooltip: string | undefined = micDisabled ? 'Configure a Groq API key in Setup to enable voice input' : undefined;

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
                <Button variant={'primary'} size={'icon'} onClick={handleSend} title={r2Tooltip} className={'shrink-0 size-8 rounded-lg'}>
                    <HiArrowUp className={'size-4'}/>
                </Button>
            );
        }

        return (
            <Button variant={'ghost'} size={'icon'} onClick={handleMicClick} disabled={effectiveDisabled || micDisabled} title={micTooltip ?? r2Tooltip} aria-label={'Start recording'} className={'shrink-0 size-8 rounded-lg'}>
                <FaMicrophone className={'size-3.5'}/>
            </Button>
        );
    };

    return (
        <div className={cn('relative flex flex-col rounded-t-xl border-x border-t border-border bg-surface', isDragOver && 'ring-2 ring-primary ring-inset')} onDragEnter={handleDragEnter}
             onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
            {/* Drag overlay */}
            {isDragOver && (
                <div className={'absolute inset-0 z-20 flex items-center justify-center rounded-t-xl bg-primary/10 border-2 border-dashed border-primary pointer-events-none'}>
                    <p className={'text-sm font-medium text-primary'}>Drop files here!</p>
                </div>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type={'file'}
                multiple
                accept={ACCEPTED_FILE_TYPES}
                onChange={handleFileInputChange}
                className={'hidden'}
            />

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
            {(voiceState === 'error' && errorMessage) && (
                <div className={'px-3 pt-3 pb-1'}>
                    <p className={'text-xs text-error'}>{errorMessage}</p>
                </div>
            )}

            {/* Attachment error message */}
            {attachmentError && (
                <div className={'px-3 pt-3 pb-1'}>
                    <p className={'text-xs text-error font-semibold'}>{attachmentError}</p>
                </div>
            )}

            {/* Voice transcription result: raw vs rephrased */}
            {(voiceState === 'done' && transcript) && (
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

            {/* Attachment preview chips */}
            {attachments.length > 0 && (
                <div className={'flex gap-2 px-3 pt-3 pb-1 overflow-x-auto'}>
                    {attachments.map((attachment: IAttachment, index: number) => (
                        <div key={`${attachment.name}-${index}`} className={'flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 shrink-0 max-w-48 group'}>
                            {/* Thumbnail or icon — HEIC/HEIF can't be rendered by browsers, show photo placeholder */}
                            {attachment.mimeType.startsWith('image/') && !HEIC_MIME_TYPES.has(attachment.mimeType) ? (
                                <Image src={`data:${attachment.mimeType};base64,${attachment.data}`} alt={attachment.name} width={32} height={32} className={'size-8 rounded object-cover shrink-0'}
                                       unoptimized/>
                            ) : HEIC_MIME_TYPES.has(attachment.mimeType) ? (
                                <span className={'size-8 rounded bg-surface flex items-center justify-center shrink-0'}>
                                    <HiOutlinePhotograph className={'size-4 text-text-muted'}/>
                                </span>
                            ) : (
                                <span className={'size-8 rounded bg-surface flex items-center justify-center shrink-0'}>
                                    <HiOutlineDocument className={'size-4 text-text-muted'}/>
                                </span>
                            )}
                            {/* Name + size */}
                            <div className={'flex flex-col min-w-0'}>
                                <span className={'text-xs text-text font-medium truncate'}>{attachment.name}</span>
                                <span className={'text-[10px] text-text-muted'}>{formatFileSize(attachment.size)}</span>
                            </div>
                            {/* Remove button */}
                            <Button variant={'ghost'} size={'icon'} onClick={(): void => removeAttachment(index)} className={'shrink-0 size-6 rounded'} aria-label={`Remove ${attachment.name}`}>
                                <HiX className={'size-3.5'}/>
                            </Button>
                        </div>
                    ))}
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
                    onPaste={handlePaste}
                    disabled={isRecording || isVoiceProcessing || r2Disabled}
                    placeholder={r2Disabled ? 'Configure Cloudflare R2 in Setup to start chatting...' : 'Send a message...'}
                    className={cn(
                        'w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-text font-medium placeholder:text-text-muted',
                        'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'overflow-y-auto max-h-64',
                    )}
                />
            </div>

            {/* Bottom toolbar: [+] [IDE] left | [ModelSelector] [ActionButton] right */}
            <div className={'flex items-center justify-between px-3 py-2'}>
                {/* Left: attach file button + IDE status */}
                <div className={'flex items-center gap-1.5'}>
                    <Button variant={'ghost'} size={'icon'} onClick={handleAttachClick} disabled={effectiveDisabled || attachments.length >= MAX_ATTACHMENTS} title={r2Tooltip} className={'size-7 rounded-lg'}
                            aria-label={'Add attachment'}>
                        <HiOutlinePlus className={'size-4'}/>
                    </Button>
                    {ideStatus && (
                        <span className={'relative flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-text-muted select-none'}
                              title={ideStatus.connected ? `Connected to ${ideStatus.ideName ?? 'IDE'}${ideStatus.currentFileName ? ` · ${ideStatus.currentFileName}` : ''}` : 'IDE disconnected'}>
                            <span className={cn('size-1.5 rounded-full', ideStatus.connected ? 'bg-success' : 'bg-text-muted/40')}/>
                            {ideStatus.ideName ?? 'IDE'}
                        </span>
                    )}
                </div>

                {/* Right: model + effort selectors + action button */}
                <div className={'flex items-center gap-2'}>
                    <ModelSelector
                        selectedModel={selectedModel}
                        selectedEffort={selectedEffort}
                        thinking={thinking}
                        onModelChange={onModelChange}
                        onEffortChange={onEffortChange}
                        onThinkingChange={onThinkingChange}
                        disabled={isLoading}
                    />
                    {renderActionButton()}
                </div>
            </div>
        </div>
    );
}

export {ChatInput};
