"use client";

import React from "react";
import {HiOutlineTrash} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import type {IDeleteSessionButtonProps} from "@/types/components";
import {DeleteSessionModal} from "@/components/DeleteSessionModal";

function DeleteSessionButton({sessionId, sessionTitle, r2Configured}: IDeleteSessionButtonProps) {
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);

    return (
        <>
            <Button variant={'ghost'} size={'sm'} onClick={() => setIsModalOpen(true)} className={'p-1.5 rounded-md text-text-muted hover:text-error'} aria-label={'Delete session'}
                    title={'Delete session'}>
                <HiOutlineTrash className={'size-4 mr-1'}/>
            </Button>
            <DeleteSessionModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} sessionId={sessionId} sessionTitle={sessionTitle} r2Configured={r2Configured}/>
        </>
    );
}

export {DeleteSessionButton};