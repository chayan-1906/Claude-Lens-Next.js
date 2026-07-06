"use client";

import React from "react";
import {TbCopy, TbCopyCheck} from "react-icons/tb";
import {Button} from "@/components/ui/Button";
import type {ICopyMessageButtonProps} from "@/types/components";

function CopyMessageButton({text}: ICopyMessageButtonProps) {
    const [copied, setCopied] = React.useState<boolean>(false);

    const handleCopy = React.useCallback(async (): Promise<void> => {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-HTTPS contexts (e.g. localhost without secure context)
                const textarea: HTMLTextAreaElement = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            console.warn('Copy to clipboard failed');
        }
    }, [text]);

    return (
        <Button variant={'ghost'} size={'icon'} onClick={handleCopy} className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'} title={'Copy message'}>
            {copied
                ? <TbCopyCheck className={'size-3.5 text-success font-bold'}/>
                : <TbCopy className={'size-3.5'}/>
            }
        </Button>
    );
}

export {CopyMessageButton};
