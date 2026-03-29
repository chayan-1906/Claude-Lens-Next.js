"use client";

import React from "react";
import {useRouter} from "next/navigation";
import {HiOutlineTrash} from "react-icons/hi";
import {routes} from "@/utils/routes";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {reclaimR2Storage} from "@/actions/r2.actions";
import {deleteProject} from "@/actions/project.actions";
import type {IDeleteProjectButtonProps} from "@/types/components";

function DeleteProjectButton({projectDir, projectName, r2Configured}: IDeleteProjectButtonProps) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [isDeleting, setIsDeleting] = React.useState<boolean>(false);
    const [reclaimR2, setReclaimR2] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleDelete = React.useCallback(async (): Promise<void> => {
        setIsDeleting(true);
        setError(null);

        const calls: [Promise<{success: boolean; error?: string}>, Promise<unknown>] = [
            deleteProject({projectDir}),
            reclaimR2 ? reclaimR2Storage({projectDir}) : Promise.resolve(),
        ];

        const [{success, error}] = await Promise.all(calls);

        if (!success) {
            setError(error || 'Failed to delete project!');
            setIsDeleting(false);
            return;
        }

        console.log('[DeleteProjectButton] dispatching project-deleted event:', {projectDir});
        window.dispatchEvent(new CustomEvent('project-deleted', {detail: {projectDir}}));
        setIsModalOpen(false);
        setIsDeleting(false);
        router.push(routes.homePath);
    }, [projectDir, reclaimR2, router]);

    const handleOpenModal = React.useCallback((e: React.MouseEvent): void => {
        e.stopPropagation();
        setReclaimR2(false);
        setError(null);
        setIsModalOpen(true);
    }, []);

    return (
        <>
            <Button variant={'ghost'} size={'sm'} onClick={handleOpenModal} className={'p-1.5 rounded-md text-text-muted hover:text-error'} aria-label={'Delete project'} title={'Delete project'}>
                <HiOutlineTrash className={'size-4'}/>
            </Button>

            <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
                <div className={'p-6'}>
                    <h2 className={'text-base font-semibold text-text'}>Delete Project</h2>
                    <p className={'text-sm text-text-muted mt-2'}>
                        Are you sure you want to delete {' '}
                        <span className={'font-medium text-text'}>{projectName}</span>
                        ? This will permanently remove all sessions, messages, tasks, and memories for this project.
                    </p>

                    {r2Configured && (
                        <label className={'flex items-center gap-2 mt-4 cursor-pointer select-none'}>
                            <input type={'checkbox'} checked={reclaimR2} onChange={(e) => setReclaimR2(e.target.checked)} className={'size-4 accent-warning cursor-pointer'}/>
                            <span className={'text-sm text-text-muted'}>Also reclaim R2 storage for this project</span>
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

export {DeleteProjectButton};
