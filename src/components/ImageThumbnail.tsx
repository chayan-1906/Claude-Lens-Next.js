"use client";

import React from "react";
import Image from "next/image";
import {cn} from "@/utils/cn";
import {ImageModal} from "@/components/ui/ImageModal";
import type {IImageThumbnailProps} from "@/types/components";

function ImageThumbnail({src, alt, width, height, className, unoptimized}: IImageThumbnailProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);

    return (
        <>
            <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                className={cn(className, 'cursor-pointer hover:scale-105 transition-transform')}
                onClick={() => setIsOpen(true)}
                unoptimized={unoptimized}
                loading={'lazy'}
            />
            {isOpen && (
                <ImageModal src={src} alt={alt} onClose={() => setIsOpen(false)}/>
            )}
        </>
    );
}

export {ImageThumbnail};
