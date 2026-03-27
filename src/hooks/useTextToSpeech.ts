import React from "react";
import {stripMarkdown} from "@/utils/stripMarkdown";
import {NEURAL_VOICES, TTS_SPEEDS} from "@/types/tts";
import {getTtsSettings, saveTtsSettings} from "@/actions/voice.actions";
import type {INeuralVoice, IGetTtsSettingsResponse, ISaveTtsSettingsResponse, IUseTextToSpeechReturn, TTSSpeed, TTSState} from "@/types/tts";

/** Max characters per TTS request chunk. Keeps individual requests fast. */
const MAX_CHUNK_CHARS: number = 4000;

/**
 * Minimum chunk size. Chunks shorter than this are merged with the next one
 * to avoid firing a fetch for a 3-word heading that plays in under a second.
 */
const MIN_CHUNK_CHARS: number = 120;

/**
 * Splits text into paragraphs, further splits oversized paragraphs at sentence
 * boundaries, then merges consecutive chunks that are too short to be useful
 * on their own.
 */
function chunkText(text: string): string[] {
    const paragraphs: string[] = text.split(/\n\n+/).filter((p: string) => p.trim().length > 0);
    const raw: string[] = [];

    for (const paragraph of paragraphs) {
        if (paragraph.length <= MAX_CHUNK_CHARS) {
            raw.push(paragraph.trim());
        } else {
            const sentences: string[] = paragraph.match(/[^.!?]+[.!?]+\s*/g) ?? [paragraph];
            let current: string = '';
            for (const sentence of sentences) {
                if ((current + sentence).length > MAX_CHUNK_CHARS && current.length > 0) {
                    raw.push(current.trim());
                    current = '';
                }
                current += sentence;
            }
            if (current.trim().length > 0) raw.push(current.trim());
        }
    }

    // Merge short chunks (e.g. lone headings) into the next one so each
    // fetch covers enough content to play longer than the previous fetch takes.
    const merged: string[] = [];
    for (const chunk of raw) {
        if (merged.length > 0 && merged[merged.length - 1].length < MIN_CHUNK_CHARS) {
            merged[merged.length - 1] += ' ' + chunk;
        } else {
            merged.push(chunk);
        }
    }

    return merged;
}

/**
 * Splits accumulated streaming text at sentence boundaries (. ! ? followed by
 * whitespace, or paragraph breaks). Returns the completed sentences and whatever
 * has not yet reached a boundary (to be buffered for the next push).
 */
function extractCompleteSentences(text: string): {sentences: string[]; remaining: string} {
    const boundaryRe: RegExp = /[.!?]+\s+|\n{2,}/g;
    const sentences: string[] = [];
    let lastIndex: number = 0;
    let match: RegExpExecArray | null;

    while ((match = boundaryRe.exec(text)) !== null) {
        const sentence: string = text.slice(lastIndex, boundaryRe.lastIndex).trim();
        if (sentence) sentences.push(sentence);
        lastIndex = boundaryRe.lastIndex;
    }

    return {sentences, remaining: text.slice(lastIndex)};
}

/**
 * Fetch one audio chunk from the TTS proxy route and return an object URL.
 * Accepts an AbortSignal so in-flight requests are cancelled on stop().
 */
async function fetchAudioUrl(text: string, voice: string, rate: number, signal: AbortSignal): Promise<string | null> {
    try {
        const res: Response = await fetch('/api/tts', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, voice, rate}),
            signal,
        });
        if (!res.ok) return null;
        const blob: Blob = await res.blob();
        return URL.createObjectURL(blob);
    } catch {
        // Catches AbortError and network errors — both treated as null (silent)
        return null;
    }
}

const useTextToSpeech = (): IUseTextToSpeechReturn => {
    const [state, setState] = React.useState<TTSState>('idle');
    const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null);
    const [selectedVoice, setSelectedVoiceState] = React.useState<INeuralVoice>(NEURAL_VOICES[0]);
    const [rate, setRateState] = React.useState<TTSSpeed>(1);

    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    /**
     * All chunk URL promises, kicked off in parallel at speak() time.
     * playChunkAt(index) simply awaits urlPromisesRef.current[index].
     */
    const urlPromisesRef = React.useRef<Promise<string | null>[]>([]);
    /** Ref to the stable playChunkAt callback — used for safe recursive invocation. */
    const playChunkAtRef = React.useRef<((index: number) => Promise<void>) | null>(null);
    /** Single AbortController for the entire current speak session. */
    const abortControllerRef = React.useRef<AbortController | null>(null);
    const isCancelledRef = React.useRef<boolean>(false);
    /** Snapshot of voice/rate at speak() time — keeps the whole chain consistent. */
    const activeVoiceRef = React.useRef<string>(NEURAL_VOICES[0].voiceId);
    const activeRateRef = React.useRef<number>(1);
    /** Stream-read mode refs — only active between startStreamRead() and endStreamRead(). */
    const isStreamModeRef = React.useRef<boolean>(false);
    const streamWaitingRef = React.useRef<boolean>(false);
    const streamPendingRef = React.useRef<string>('');
    const streamLastLengthRef = React.useRef<number>(0);

    // --- Restore preferences ---
    React.useEffect(() => {
        getTtsSettings().then((result: IGetTtsSettingsResponse): void => {
            if (!result.success) return;
            if (result.voiceId) {
                const match: INeuralVoice | undefined = NEURAL_VOICES.find((voice: INeuralVoice) => voice.voiceId === result.voiceId);
                if (match) setSelectedVoiceState(match);
            }
            if (result.rate !== undefined && TTS_SPEEDS.includes(result.rate as TTSSpeed)) {
                setRateState(result.rate as TTSSpeed);
            }
        });
    }, []);

    /** Cancel all in-flight requests and revoke any already-resolved URLs. */
    const cancelAll = React.useCallback((): void => {
        isCancelledRef.current = true;
        abortControllerRef.current?.abort();
        abortControllerRef.current = null;

        // Revoke object URLs for chunks that were fetched but never played
        const promises: Promise<string | null>[] = urlPromisesRef.current;
        urlPromisesRef.current = [];
        promises.forEach((p: Promise<string | null>) => {
            p.then((url: string | null) => {
                if (url) URL.revokeObjectURL(url);
            });
        });

        if (audioRef.current) {
            audioRef.current.onended = null;
            audioRef.current.onerror = null;
            audioRef.current.pause();
            audioRef.current = null;
        }
    }, []);

    /**
     * Awaits the URL for chunk at `index` and plays it.
     * On `onended`, advances to index + 1 — no gap because all fetches
     * were already started in parallel at speak() time.
     */
    const playChunkAt = React.useCallback(async (index: number): Promise<void> => {
        if (isCancelledRef.current) return;

        const promise: Promise<string | null> | undefined = urlPromisesRef.current[index];
        if (!promise) {
            if (isStreamModeRef.current) {
                // More sentences will arrive — park here until pushStreamText kicks us
                streamWaitingRef.current = true;
                return;
            }
            setState('idle');
            setActiveMessageId(null);
            return;
        }

        const url: string | null = await promise;

        if (!url || isCancelledRef.current) {
            if (url) URL.revokeObjectURL(url);
            setState('idle');
            setActiveMessageId(null);
            return;
        }

        const audio: HTMLAudioElement = new Audio(url);
        audioRef.current = audio;

        audio.onended = (): void => {
            URL.revokeObjectURL(url);
            playChunkAtRef.current?.(index + 1);
        }
        audio.onerror = (): void => {
            URL.revokeObjectURL(url);
            setState('idle');
            setActiveMessageId(null);
        }

        try {
            await audio.play();
        } catch {
            URL.revokeObjectURL(url);
            setState('idle');
            setActiveMessageId(null);
        }
    }, []);

    React.useEffect(() => {
        playChunkAtRef.current = playChunkAt;
    }, [playChunkAt]);

    // --- Public API ---
    const speak = React.useCallback((text: string, messageId: string): void => {
        cancelAll();

        const clean: string = stripMarkdown(text);
        const chunks: string[] = chunkText(clean);
        if (chunks.length === 0) return;

        isCancelledRef.current = false;
        activeVoiceRef.current = selectedVoice.voiceId;
        activeRateRef.current = rate;

        // Fire ALL chunk requests in parallel immediately — eliminates inter-chunk gaps
        const ctrl: AbortController = new AbortController();
        abortControllerRef.current = ctrl;
        urlPromisesRef.current = chunks.map((chunk: string) =>
            fetchAudioUrl(chunk, activeVoiceRef.current, activeRateRef.current, ctrl.signal),
        );

        setActiveMessageId(messageId);
        setState('speaking');
        playChunkAt(0);
    }, [selectedVoice, rate, cancelAll, playChunkAt]);

    const pause = React.useCallback((): void => {
        if (audioRef.current) {
            audioRef.current.pause();
            setState('paused');
        }
    }, []);

    const resume = React.useCallback((): void => {
        if (audioRef.current) {
            audioRef.current.play().catch(() => { /* ignore */ });
            setState('speaking');
        }
    }, []);

    const stop = React.useCallback((): void => {
        cancelAll();
        setState('idle');
        setActiveMessageId(null);
    }, [cancelAll]);

    const startStreamRead = React.useCallback((messageId: string): void => {
        cancelAll();
        isCancelledRef.current = false;
        isStreamModeRef.current = true;
        streamWaitingRef.current = true;   // treat as waiting so the first push triggers playback
        streamPendingRef.current = '';
        streamLastLengthRef.current = 0;
        activeVoiceRef.current = selectedVoice.voiceId;
        activeRateRef.current = rate;
        abortControllerRef.current = new AbortController();
        urlPromisesRef.current = [];
        setActiveMessageId(messageId);
        setState('speaking');
    }, [selectedVoice, rate, cancelAll]);

    const pushStreamText = React.useCallback((fullText: string): void => {
        if (!isStreamModeRef.current || isCancelledRef.current) return;

        const newText: string = fullText.slice(streamLastLengthRef.current);
        streamLastLengthRef.current = fullText.length;
        if (!newText) return;

        streamPendingRef.current += newText;
        const {sentences, remaining} = extractCompleteSentences(streamPendingRef.current);
        streamPendingRef.current = remaining;

        for (const sentence of sentences) {
            const clean: string = stripMarkdown(sentence).trim();
            if (!clean || !abortControllerRef.current) continue;
            const idx: number = urlPromisesRef.current.length;
            urlPromisesRef.current.push(fetchAudioUrl(clean, activeVoiceRef.current, activeRateRef.current, abortControllerRef.current.signal));
            if (streamWaitingRef.current) {
                streamWaitingRef.current = false;
                void playChunkAtRef.current?.(idx);
            }
        }
    }, []);

    const endStreamRead = React.useCallback((): void => {
        isStreamModeRef.current = false;

        const remaining: string = stripMarkdown(streamPendingRef.current).trim();
        streamPendingRef.current = '';
        streamLastLengthRef.current = 0;

        if (remaining && abortControllerRef.current && !isCancelledRef.current) {
            const idx: number = urlPromisesRef.current.length;
            urlPromisesRef.current.push(fetchAudioUrl(remaining, activeVoiceRef.current, activeRateRef.current, abortControllerRef.current.signal));
            if (streamWaitingRef.current) {
                streamWaitingRef.current = false;
                void playChunkAtRef.current?.(idx);
            }
        } else if (streamWaitingRef.current) {
            // Nothing left — the player was waiting on more that never came
            streamWaitingRef.current = false;
            setState('idle');
            setActiveMessageId(null);
        }
    }, []);

    const setSelectedVoice = React.useCallback((voice: INeuralVoice): void => {
        setSelectedVoiceState(voice);
        void saveTtsSettings({voiceId: voice.voiceId}).catch((): ISaveTtsSettingsResponse => ({success: false}));
    }, []);

    const setRate = React.useCallback((newRate: TTSSpeed): void => {
        setRateState(newRate);
        void saveTtsSettings({rate: newRate}).catch((): ISaveTtsSettingsResponse => ({success: false}));
    }, []);

    // Cleanup on unmount
    React.useEffect(() => {
        return (): void => {
            cancelAll();
        };
    }, [cancelAll]);

    return {state, activeMessageId, selectedVoice, rate, speak, pause, resume, stop, setSelectedVoice, setRate, startStreamRead, pushStreamText, endStreamRead};
}

export {useTextToSpeech};
