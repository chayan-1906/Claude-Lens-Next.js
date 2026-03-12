"use client";

import React from "react";
import {TbCopy, TbCopyCheck} from "react-icons/tb";
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
        <Button variant={'ghost'} size={'icon'} onClick={handleCopy} className={'size-6 text-text-muted active:bg-transparent hover:bg-transparent'} title={'Copy message'}>
            {copied
                ? <TbCopyCheck className={'size-3.5 text-success font-bold'}/>
                : <TbCopy className={'size-3.5'}/>
            }
        </Button>
    );
}

export {CopyMessageButton};
