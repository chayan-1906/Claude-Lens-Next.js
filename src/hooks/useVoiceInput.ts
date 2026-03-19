import React from "react";
import {transcribeAudio} from "@/actions/voice.actions";
import type {ISpeechRecognition, ISpeechRecognitionEvent, SpeechRecognitionConstructor, UseVoiceInputReturn, VoiceInputState} from "@/types/voice";

/**
 * How long (ms) at recording start to sample ambient noise for calibration.
 * Threshold is derived from this baseline — no hardcoded value needed.
 */
const CALIBRATION_MS: number = 500;
/** dynamicThreshold = avgAmbientEnergy × SPEECH_MULTIPLIER */
const SPEECH_MULTIPLIER: number = 10;
/** How long (ms) silence must persist before isSpeaking flips to false */
const SILENCE_DEBOUNCE_MS: number = 400;

const useVoiceInput = (): UseVoiceInputReturn => {
    const [state, setState] = React.useState<VoiceInputState>('idle');
    const [isSpeaking, setIsSpeaking] = React.useState<boolean>(false);
    const [liveTranscript, setLiveTranscript] = React.useState<string>('');
    const [transcript, setTranscript] = React.useState<string>('');
    const [rephrased, setRephrased] = React.useState<string>('');
    const [errorMessage, setErrorMessage] = React.useState<string>('');

    const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
    const chunksRef = React.useRef<BlobPart[]>([]);
    const audioContextRef = React.useRef<AudioContext | null>(null);
    const rafRef = React.useRef<number | null>(null);
    const silenceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const recognitionRef = React.useRef<ISpeechRecognition | null>(null);
    const speechGuardIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    const startRecording = React.useCallback(async (): Promise<void> => {
        try {
            const stream: MediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    // Disable AGC: when enabled the browser boosts quiet signals
                    // (noise floor), which caused false positives with any threshold
                    autoGainControl: false,
                },
            });

            // --- Speech-frequency energy VAD via Web Audio API ---
            const audioContext: AudioContext = new AudioContext();
            // Chrome/Safari may start the context suspended even after a user gesture
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            const analyser: AnalyserNode = audioContext.createAnalyser();
            analyser.fftSize = 2048;              // standard for speech; 1024 bins
            analyser.smoothingTimeConstant = 0.5; // moderate smoothing, fast response
            audioContext.createMediaStreamSource(stream).connect(analyser);
            audioContextRef.current = audioContext;

            // getByteFrequencyData needs frequencyBinCount (= fftSize / 2) slots
            const frequencyData: Uint8Array<ArrayBuffer> = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;

            // Compute speech band bin indices (80–3000 Hz) from the actual sample rate
            const hzPerBin: number = (audioContext.sampleRate / 2) / analyser.frequencyBinCount;
            const speechStartBin: number = Math.round(80 / hzPerBin);
            const speechEndBin: number = Math.round(3000 / hzPerBin);

            // Calibration state — local to this recording session (lives in closure)
            const calibrationSamples: number[] = [];
            const calibrationEnd: number = Date.now() + CALIBRATION_MS;
            let calibrated: boolean = false;
            let dynamicThreshold: number = 3000; // safe fallback

            const checkVolume = (): void => {
                analyser.getByteFrequencyData(frequencyData);

                // Sum energy only in the human speech frequency band (80–3000 Hz)
                let energy: number = 0;
                for (let i = speechStartBin; i <= speechEndBin; i++) {
                    energy += frequencyData[i];
                }

                if (!calibrated) {
                    if (Date.now() < calibrationEnd) {
                        calibrationSamples.push(energy);
                    } else {
                        if (calibrationSamples.length > 0) {
                            const avgNoise: number =
                                calibrationSamples.reduce((a: number, b: number) => a + b, 0) /
                                calibrationSamples.length;
                            dynamicThreshold = Math.max(2000, avgNoise * SPEECH_MULTIPLIER);
                        }
                        calibrated = true;
                    }
                } else {
                    if (energy > dynamicThreshold) {
                        if (silenceTimerRef.current !== null) {
                            clearTimeout(silenceTimerRef.current);
                            silenceTimerRef.current = null;
                        }
                        setIsSpeaking(true);
                    } else {
                        if (silenceTimerRef.current === null) {
                            silenceTimerRef.current = setTimeout((): void => {
                                setIsSpeaking(false);
                                silenceTimerRef.current = null;
                            }, SILENCE_DEBOUNCE_MS);
                        }
                    }
                }

                rafRef.current = requestAnimationFrame(checkVolume);
            };
            rafRef.current = requestAnimationFrame(checkVolume);
            // -----------------------------------------------------------------------

            // --- Speech guard: track whether any audio crossed the threshold ---
            // Prevents posting silent recordings to the backend (Whisper hallucinates
            // words like "Thank you" on silence). Runs independently of the wave VAD.
            let hasSpeech: boolean = false;
            speechGuardIntervalRef.current = setInterval((): void => {
                analyser.getByteFrequencyData(frequencyData);
                let sum: number = 0;
                for (let i = 0; i < frequencyData.length; i++) {
                    sum += frequencyData[i];
                }
                const avg: number = sum / frequencyData.length;
                if (avg > 10) hasSpeech = true;
            }, 100);
            // -------------------------------------------------------------------

            // --- Web Speech API: live interim transcription ---
            const SpeechRecognitionClass = (
                (window as Window & { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
                (window as Window & { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
            );

            if (SpeechRecognitionClass) {
                const recognition: ISpeechRecognition = new SpeechRecognitionClass();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                let finalText: string = '';

                recognition.onresult = (event: ISpeechRecognitionEvent): void => {
                    let interimText: string = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            finalText += event.results[i][0].transcript;
                        } else {
                            interimText += event.results[i][0].transcript;
                        }
                    }
                    setLiveTranscript(finalText + interimText);
                };

                // Chrome stops recognition after silence — restart if still recording
                recognition.onend = (): void => {
                    if (mediaRecorderRef.current?.state === 'recording') {
                        recognition.start();
                    }
                };

                recognition.onerror = (): void => {/* silent fail — live transcript is optional */
                };

                recognition.start();
                recognitionRef.current = recognition;
            }
            // --------------------------------------------------

            const recorder: MediaRecorder = new MediaRecorder(stream, {mimeType: 'audio/webm'});
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e: BlobEvent): void => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async (): Promise<void> => {
                // Stop VAD loop
                if (rafRef.current !== null) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                }
                if (silenceTimerRef.current !== null) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
                audioContextRef.current?.close();
                audioContextRef.current = null;
                setIsSpeaking(false);

                // Stop live transcription
                recognitionRef.current?.stop();
                recognitionRef.current = null;
                setLiveTranscript('');

                if (speechGuardIntervalRef.current !== null) {
                    clearInterval(speechGuardIntervalRef.current);
                    speechGuardIntervalRef.current = null;
                }
                if (!hasSpeech) {
                    stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                    setErrorMessage('No speech detected. Please try again with a longer recording!');
                    setState('error');
                    return;
                }

                setState('processing');

                const blob: Blob = new Blob(chunksRef.current, {type: 'audio/webm'});
                const formData: FormData = new FormData();
                formData.append('audio', blob, 'recording.webm');

                try {
                    const result = await transcribeAudio(formData);

                    if (!result.success) {
                        setErrorMessage(result.error || 'Transcription failed. Please try again.');
                        setState('error');
                        return;
                    }

                    setTranscript(result.transcript || '');
                    setRephrased(result.rephrased || '');
                    setState('done');
                } catch {
                    setErrorMessage('Failed to reach the backend. Is the server running?');
                    setState('error');
                } finally {
                    stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
                }
            };

            recorder.start();
            setState('recording');
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === 'NotAllowedError') {
                setErrorMessage('Microphone access denied. Please allow microphone access and try again!');
            } else {
                setErrorMessage('Could not access microphone. Please check your device settings!');
            }
            setState('error');
        }
    }, []);

    const stopRecording = React.useCallback((): void => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const reset = React.useCallback((): void => {
        // Stop active recording if any — detach handlers first to prevent
        // onstop from triggering the transcription pipeline
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.ondataavailable = null;
            mediaRecorderRef.current.stop();
        }
        // Cancel RAF loop
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        // Clear silence timer
        if (silenceTimerRef.current !== null) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
        // Clear speech guard interval
        if (speechGuardIntervalRef.current !== null) {
            clearInterval(speechGuardIntervalRef.current);
            speechGuardIntervalRef.current = null;
        }
        // Stop SpeechRecognition
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        // Close AudioContext
        audioContextRef.current?.close();
        audioContextRef.current = null;
        // Stop all media stream tracks (release microphone)
        mediaRecorderRef.current?.stream
            ?.getTracks()
            .forEach((track: MediaStreamTrack) => track.stop());
        // Reset state
        setState('idle');
        setIsSpeaking(false);
        setLiveTranscript('');
        setTranscript('');
        setRephrased('');
        setErrorMessage('');
    }, []);

    // Cleanup all recording resources on unmount
    React.useEffect(() => {
        return (): void => {
            if (mediaRecorderRef.current?.state === 'recording') {
                mediaRecorderRef.current.onstop = null;
                mediaRecorderRef.current.ondataavailable = null;
                mediaRecorderRef.current.stop();
            }
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
            if (silenceTimerRef.current !== null) {
                clearTimeout(silenceTimerRef.current);
            }
            if (speechGuardIntervalRef.current !== null) {
                clearInterval(speechGuardIntervalRef.current);
            }
            audioContextRef.current?.close();
            recognitionRef.current?.stop();
            mediaRecorderRef.current?.stream
                ?.getTracks()
                .forEach((track: MediaStreamTrack) => track.stop());
        };
    }, []);

    return {state, isSpeaking, liveTranscript, transcript, rephrased, errorMessage, startRecording, stopRecording, reset};
}

export {useVoiceInput};
