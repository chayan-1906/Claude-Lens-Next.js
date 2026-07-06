"use client";

import React from "react";
import {HiOutlineCog} from "react-icons/hi";
import {cn} from "@/utils/cn";
import type {INeuralVoice, TTSSpeed} from "@/types/tts";
import {NEURAL_VOICES, TTS_SPEEDS} from "@/types/tts";
import {Button} from "@/components/ui/Button";
import type {IVoiceSettingsPopoverProps} from "@/types/components";

function VoiceSettingsPopover({tts, triggerClassName}: IVoiceSettingsPopoverProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const popoverRef = React.useRef<HTMLDivElement | null>(null);

    // Close on outside click
    React.useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (mouseEvent: MouseEvent): void => {
            if (popoverRef.current && !popoverRef.current.contains(mouseEvent.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return (): void => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={'relative'} ref={popoverRef}>
            <Button
                variant={'ghost'}
                size={'icon'}
                onClick={() => setIsOpen((prev: boolean) => !prev)}
                className={cn('size-6 text-text-muted active:bg-transparent hover:bg-transparent', triggerClassName)}
                title={'Voice settings'}
            >
                <HiOutlineCog className={'size-3.5'}/>
            </Button>

            {isOpen && (
                <div className={'absolute bottom-full right-0 mb-2 w-60 rounded-lg border border-border bg-surface p-3 shadow-lg z-50'}>
                    {/* Voice selector */}
                    <label className={'block text-xs font-medium text-text-muted mb-1.5'}>Voice</label>
                    <div className={'flex flex-col gap-1 mb-3'}>
                        {NEURAL_VOICES.map((voice: INeuralVoice) => (
                            <Button
                                key={voice.voiceId}
                                variant={'ghost'}
                                size={'sm'}
                                onClick={() => tts.setSelectedVoice(voice)}
                                className={cn(
                                    'justify-start h-auto px-2 py-1.5 text-xs',
                                    tts.selectedVoice.voiceId === voice.voiceId
                                        ? 'bg-primary/10 text-primary hover:bg-primary/10 active:bg-primary/10'
                                        : 'text-text-muted hover:bg-border',
                                )}
                            >
                                <span className={'flex-1 text-left'}>{voice.name}</span>
                                <span className={cn('text-[10px] font-normal', voice.gender === 'Female' ? 'text-pink-400' : 'text-blue-400')}>
                                    {voice.gender}
                                </span>
                            </Button>
                        ))}
                    </div>

                    {/* Speed selector */}
                    <label className={'block text-xs font-medium text-text-muted mb-1.5'}>Speed</label>
                    <div className={'flex gap-1'}>
                        {TTS_SPEEDS.map((speed: TTSSpeed) => (
                            <Button
                                key={speed}
                                variant={'ghost'}
                                size={'sm'}
                                onClick={() => tts.setRate(speed)}
                                className={cn(
                                    'flex-1 h-auto px-1.5 py-1 text-xs font-medium',
                                    tts.rate === speed
                                        ? 'bg-primary text-background hover:bg-primary active:bg-primary'
                                        : 'bg-background text-text-muted hover:bg-border',
                                )}
                            >
                                {speed}x
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export {VoiceSettingsPopover};
