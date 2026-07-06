"use client";

import React from "react";
import {FaRegFilePdf} from "react-icons/fa";
import {Button} from "@/components/ui/Button";
import {DownloadSessionPdfModal} from "@/components/DownloadSessionPdfModal";
import type {IDownloadSessionPdfButtonProps} from "@/types/components";

function DownloadSessionPdfButton({sessionId}: IDownloadSessionPdfButtonProps) {
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);

    const handleClick = React.useCallback((mouseEvent: React.MouseEvent): void => {
        mouseEvent.stopPropagation();
        setIsModalOpen(true);
    }, []);

    return (
        <>
            <Button variant={'ghost'} size={'sm'} onClick={handleClick} aria-label={'Download session as PDF'} title={'Download session as PDF'} className={'p-1.5 rounded-md text-text-muted hover:text-primary'}>
                <FaRegFilePdf className={'size-4'}/>
            </Button>
            <DownloadSessionPdfModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} sessionId={sessionId}/>
        </>
    );
}

export {DownloadSessionPdfButton};
