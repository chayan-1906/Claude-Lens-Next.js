/** ------------- Constants and Type Aliases ------------- */

export type TTSSpeed = 0.75 | 1 | 1.25 | 1.5 | 2;

export type TTSState = 'idle' | 'speaking' | 'paused';

export const TTS_SPEEDS: TTSSpeed[] = [0.75, 1, 1.25, 1.5, 2];

/** Curated English Neural voices available via Microsoft Edge TTS */
export const NEURAL_VOICES: INeuralVoice[] = [
    {name: 'Aria', voiceId: 'en-US-AriaNeural', gender: 'Female'},
    {name: 'Jenny', voiceId: 'en-US-JennyNeural', gender: 'Female'},
    {name: 'Michelle', voiceId: 'en-US-MichelleNeural', gender: 'Female'},
    {name: 'Guy', voiceId: 'en-US-GuyNeural', gender: 'Male'},
    {name: 'Christopher', voiceId: 'en-US-ChristopherNeural', gender: 'Male'},
    {name: 'Eric', voiceId: 'en-US-EricNeural', gender: 'Male'},
];


/** ------------- API response types ------------- */


/** ------------- function params ------------- */

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
}
