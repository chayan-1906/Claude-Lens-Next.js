/** ------------- Constants and Type Aliases ------------- */

export type VoiceInputState = 'idle' | 'recording' | 'processing' | 'done' | 'error';


/** ------------- API response types ------------- */

export type TranscribeApiSuccess = {
    success: true;
    message: string;
    transcript: string;
    rephrased: string;
};

export type TranscribeApiError = {
    success: false;
    error: {
        code: string;
        message: string;
    };
};

export type TranscribeApiResponse = TranscribeApiSuccess | TranscribeApiError;

export interface ITranscribeResult {
    success: boolean;
    transcript?: string;
    rephrased?: string;
    error?: string;
}

export interface UseVoiceInputReturn {
    state: VoiceInputState;
    isSpeaking: boolean;
    liveTranscript: string;
    transcript: string;
    rephrased: string;
    errorMessage: string;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    reset: () => void;
}


/** ------------- function params ------------- */

export interface ISpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly 0: { readonly transcript: string };
}

export interface ISpeechRecognitionResultList {
    readonly length: number;
    readonly [index: number]: ISpeechRecognitionResult;
}

export interface ISpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: ISpeechRecognitionResultList;
}

export interface ISpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: ISpeechRecognitionEvent) => void) | null;
    onend: (() => void) | null;
    onerror: (() => void) | null;
    start(): void;
    stop(): void;
}

export type SpeechRecognitionConstructor = new () => ISpeechRecognition;
