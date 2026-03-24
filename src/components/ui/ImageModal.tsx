"use client";

import React from "react";
import Image from "next/image";
import {createPortal} from "react-dom";
import type {IImageModalProps} from "@/types/components";

const subscribe = () => () => {
};

function ImageModal({src, alt, onClose}: IImageModalProps) {
    const mounted: boolean = React.useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );

    React.useLayoutEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!mounted) return null;

    return createPortal(
        <div className={'fixed inset-0 z-50 flex items-center justify-center bg-black/80'} onClick={onClose} role={'dialog'} aria-modal={'true'}>
            <Image
                src={src}
                alt={alt}
                width={1920}
                height={1080}
                className={'max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl'}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                unoptimized
                loading={'eager'}
            />
        </div>,
        document.body,
    );
}

export {ImageModal};
