"use client";

import React from "react";
import {useRouter} from "next/navigation";
import {HiOutlineTrash} from "react-icons/hi";
import {routes} from "@/utils/routes";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {deleteTasks} from "@/actions/task.actions";
import type {IDeleteTasksButtonProps} from "@/types/components";

function DeleteTasksButton({sessionId}: IDeleteTasksButtonProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleDelete = React.useCallback(async (): Promise<void> => {
        setIsDeleting(true);
        setError(null);

        const {success, error} = await deleteTasks({sessionId});

        if (!success) {
            setError(error || 'Failed to delete tasks!');
            setIsDeleting(false);
            return;
        }

        setIsModalOpen(false);
        setIsDeleting(false);
        router.push(routes.sessionPath(sessionId));
    }, [sessionId, router]);

    return (
        <>
            <Button variant={'ghost'} size={'sm'} onClick={() => setIsModalOpen(true)} className={'p-1.5 rounded-md text-text-muted hover:text-error'} aria-label={'Delete tasks'}
                    title={'Delete all tasks for this session'}>
                <HiOutlineTrash className={'size-4'}/>
            </Button>

            <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
                <div className={'p-6'}>
                    <h2 className={'text-base font-semibold text-text'}>{'Delete Tasks'}</h2>
                    <p className={'text-sm text-text-muted mt-2'}>
                        {'Are you sure you want to delete all tasks for this session? This action cannot be undone.'}
                    </p>

                    {error && (
                        <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                    )}

                    <div className={'flex items-center justify-end gap-2 mt-5'}>
                        <Button variant={'ghost'} size={'sm'} onClick={() => setIsModalOpen(false)} disabled={isDeleting}>
                            {'Cancel'}
                        </Button>
                        <Button variant={'danger'} size={'sm'} onClick={handleDelete} isLoading={isDeleting}>
                            {'Delete'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export {DeleteTasksButton};
