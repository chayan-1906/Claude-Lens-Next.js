"use client";

import React from "react";
import {useRouter} from "next/navigation";
import {HiOutlineTrash} from "react-icons/hi";
import {routes} from "@/utils/routes";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import type {IDeleteSessionButtonProps} from "@/types/components";
import {deleteSession, refreshSidebar} from "@/actions/session.actions";

function DeleteSessionButton({sessionId, sessionTitle, r2Configured}: IDeleteSessionButtonProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
    const [reclaimR2, setReclaimR2] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleDelete = React.useCallback(async (): Promise<void> => {
        setIsDeleting(true);
        setError(null);

        const {success, error} = await deleteSession({sessionId, reclaimR2});

        if (!success) {
            setError(error || 'Failed to delete session!');
            setIsDeleting(false);
            return;
        }

        console.log('[DeleteSessionButton] dispatching session-deleted event:', {sessionId});
        window.dispatchEvent(new CustomEvent('session-deleted', {detail: {sessionId}}));
        setIsModalOpen(false);
        setIsDeleting(false);
        // Navigate away first, then invalidate caches + refresh after a delay
        // so the re-render targets the home page — not the deleted session's
        // page (which would call getSession and produce SESSION_NOT_FOUND)
        router.replace(routes.homePath);
        setTimeout(async (): Promise<void> => {
            await refreshSidebar();
            router.refresh();
        }, 500);
    }, [sessionId, reclaimR2, router]);

    const handleOpenModal = React.useCallback((): void => {
        setReclaimR2(false);
        setError(null);
        setIsModalOpen(true);
    }, []);

    return (
        <>
            <Button variant={'ghost'} size={'sm'} onClick={handleOpenModal} className={'p-1.5 rounded-md text-text-muted hover:text-error'} aria-label={'Delete session'}
                    title={'Delete session'}>
                <HiOutlineTrash className={'size-4 mr-1'}/>
            </Button>

            <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
                <div className={'p-6'}>
                    <h2 className={'text-base font-semibold text-text'}>{'Delete Session'}</h2>
                    <p className={'text-sm text-text-muted mt-2'}>
                        {'Are you sure you want to delete '}
                        <span className={'font-medium text-text'}>{sessionTitle}</span>
                        ? This will permanently remove the session, its messages, and associated tasks.
                    </p>

                    {r2Configured && (
                        <label className={'flex items-center gap-2 mt-4 cursor-pointer select-none'}>
                            <input type={'checkbox'} checked={reclaimR2} onChange={(e) => setReclaimR2(e.target.checked)} className={'size-4 accent-warning cursor-pointer'}/>
                            <span className={'text-sm text-text-muted'}>Also reclaim R2 storage for this session</span>
                        </label>
                    )}

                    {error && (
                        <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                    )}

                    <div className={'flex items-center justify-end gap-2 mt-5'}>
                        <Button variant={'ghost'} size={'sm'} onClick={() => setIsModalOpen(false)} disabled={isDeleting}>
                            Cancel
                        </Button>
                        <Button variant={'danger'} size={'sm'} onClick={handleDelete} isLoading={isDeleting}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export {DeleteSessionButton};
