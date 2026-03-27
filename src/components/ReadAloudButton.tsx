"use client";

import React from "react";
import {HiOutlineVolumeUp} from "react-icons/hi";
import {TbPlayerPause, TbPlayerStop} from "react-icons/tb";
import {Button} from "@/components/ui/Button";
import {IReadAloudButtonProps} from "@/types/components";

function ReadAloudButton({text, messageId, tts, onSpeak}: IReadAloudButtonProps) {
    const isActive: boolean = tts.activeMessageId === messageId;

    const handleClick = React.useCallback((): void => {
        if (isActive && tts.state === 'speaking') {
            tts.pause();
        } else if (isActive && tts.state === 'paused') {
            tts.resume();
        } else if (onSpeak) {
            onSpeak();
        } else {
            tts.speak(text, messageId);
        }
    }, [isActive, tts, text, messageId, onSpeak]);

    const handleStop = React.useCallback((): void => {
        tts.stop();
    }, [tts]);

    return (
        <div className={'flex items-center gap-0.5'}>
            <Button variant={'ghost'} size={'icon'} onClick={handleClick} className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'}
                    title={isActive && tts.state === 'speaking' ? 'Pause' : isActive && tts.state === 'paused' ? 'Resume' : 'Read aloud'}>
                {isActive && tts.state === 'speaking'
                    ? <TbPlayerPause className={'size-3.5 text-success'}/>
                    : <HiOutlineVolumeUp className={'size-3.5'}/>
                }
            </Button>
            {isActive && tts.state !== 'idle' && (
                <Button variant={'ghost'} size={'icon'} onClick={handleStop} className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'} title={'Stop'}>
                    <TbPlayerStop className={'size-3.5'}/>
                </Button>
            )}
        </div>
    );
}

export {ReadAloudButton};
