"use client";

import React from "react";
import {HiOutlineCheck, HiOutlineClipboardCopy} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import type {ICopyMessageButtonProps} from "@/types/components";

function CopyMessageButton({text}: ICopyMessageButtonProps) {
    const [copied, setCopied] = React.useState<boolean>(false);

    const handleCopy = React.useCallback(async (): Promise<void> => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [text]);

    return (
        <Button variant={'ghost'} size={'icon'} onClick={handleCopy} className={'size-6 text-text-muted'} title={'Copy message'}>
            {copied
                ? <HiOutlineCheck className={'size-3.5 text-success'}/>
                : <HiOutlineClipboardCopy className={'size-3.5'}/>
            }
        </Button>
    );
}

export {CopyMessageButton};
