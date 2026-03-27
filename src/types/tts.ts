/** ------------- Constants and Type Aliases ------------- */

export type TTSSpeed = 0.75 | 1 | 1.25 | 1.5 | 2;

export type TTSState = 'idle' | 'speaking' | 'paused';

export const TTS_SPEEDS: TTSSpeed[] = [0.75, 1, 1.25, 1.5, 2];

/** Curated English Neural voices available via Microsoft Edge TTS */
export const NEURAL_VOICES: INeuralVoice[] = [
    {name: 'Aria', voiceId: 'en-US-AriaNeural', gender: 'Female'},
    {name: 'Michelle', voiceId: 'en-US-MichelleNeural', gender: 'Female'},
    {name: 'Sonia', voiceId: 'en-GB-SoniaNeural', gender: 'Female'},
    {name: 'Libby', voiceId: 'en-GB-LibbyNeural', gender: 'Female'},
    {name: 'Natasha', voiceId: 'en-AU-NatashaNeural', gender: 'Female'},
    {name: 'Brian', voiceId: 'en-US-BrianNeural', gender: 'Male'},
    {name: 'Andrew', voiceId: 'en-US-AndrewNeural', gender: 'Male'},
    {name: 'Ryan', voiceId: 'en-GB-RyanNeural', gender: 'Male'},
];


/** ------------- API response types ------------- */

export interface IGetTtsSettingsResponse {
    success: boolean;
    voiceId?: string;
    rate?: number;
    error?: string;
}

export interface ISaveTtsSettingsResponse {
    success: boolean;
    error?: string;
}

/** ------------- function params ------------- */

export interface ISaveTtsSettingsParams {
    voiceId?: string;
    rate?: number;
}

export interface INeuralVoice {
    name: string;
    voiceId: string;
    gender: 'Female' | 'Male';
}

export interface IUseTextToSpeechReturn {
    state: TTSState;
    activeMessageId: string | null;
    selectedVoice: INeuralVoice;
    rate: TTSSpeed;
    speak: (text: string, messageId: string) => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    setSelectedVoice: (voice: INeuralVoice) => void;
    setRate: (rate: TTSSpeed) => void;
    /** Begin stream-read mode for a live response. Call before the first pushStreamText. */
    startStreamRead: (messageId: string) => void;
    /** Feed the full accumulated speakable text so far — the hook diffs internally. */
    pushStreamText: (fullText: string) => void;
    /** Signal that streaming is done — flushes any remaining buffered text. */
    endStreamRead: () => void;
}
