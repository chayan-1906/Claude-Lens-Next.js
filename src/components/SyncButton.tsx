"use client";

import React from "react";
import {HiOutlineCloudUpload} from "react-icons/hi";
import {Modal} from "@/components/ui/Modal";
import type {SyncTarget} from "@/types/sync";
import {ALL_SYNC_TARGETS, type ISyncResponse} from "@/types/sync";
import {Button} from "@/components/ui/Button";
import {getLocalProjects, syncData} from "@/actions/sync.actions";

function SyncButton() {
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [projects, setProjects] = React.useState<string[]>([]);
    const [selectedProjects, setSelectedProjects] = React.useState<Set<string>>(new Set());
    const [selectedTargets, setSelectedTargets] = React.useState<Set<SyncTarget>>(new Set(ALL_SYNC_TARGETS));
    const [isLoadingProjects, setIsLoadingProjects] = React.useState<boolean>(false);
    const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [result, setResult] = React.useState<ISyncResponse | null>(null);

    const allProjectsSelected: boolean = projects.length > 0 && selectedProjects.size === projects.length;
    const allTargetsSelected: boolean = selectedTargets.size === ALL_SYNC_TARGETS.length;

    const handleOpen = React.useCallback(async (): Promise<void> => {
        setIsModalOpen(true);
        setError(null);
        setResult(null);

        setIsLoadingProjects(true);
        const {success, projects: fetchedProjects, error: fetchError} = await getLocalProjects();
        setIsLoadingProjects(false);

        if (!success || !fetchedProjects) {
            setError(fetchError || 'Failed to load local projects!');
            return;
        }

        setProjects(fetchedProjects);
        setSelectedProjects(new Set(fetchedProjects));
    }, []);

    const handleToggleAllProjects = React.useCallback((): void => {
        setSelectedProjects((prev: Set<string>) => {
            if (prev.size === projects.length) {
                return new Set();
            }
            return new Set(projects);
        });
    }, [projects]);

    const handleToggleProject = React.useCallback((projectDir: string): void => {
        setSelectedProjects((prev: Set<string>) => {
            const next: Set<string> = new Set(prev);
            if (next.has(projectDir)) {
                next.delete(projectDir);
            } else {
                next.add(projectDir);
            }
            return next;
        });
    }, []);

    const handleToggleAllTargets = React.useCallback((): void => {
        setSelectedTargets((prev: Set<SyncTarget>) => {
            if (prev.size === ALL_SYNC_TARGETS.length) {
                return new Set();
            }
            return new Set(ALL_SYNC_TARGETS);
        });
    }, []);

    const handleToggleTarget = React.useCallback((target: SyncTarget): void => {
        setSelectedTargets((prev: Set<SyncTarget>) => {
            const next: Set<SyncTarget> = new Set(prev);
            if (next.has(target)) {
                next.delete(target);
            } else {
                next.add(target);
            }
            return next;
        });
    }, []);

    const handleSync = React.useCallback(async (): Promise<void> => {
        setIsSyncing(true);
        setError(null);
        setResult(null);

        const response: ISyncResponse = await syncData({
            projectDirs: Array.from(selectedProjects),
            targets: Array.from(selectedTargets),
        });

        setIsSyncing(false);

        if (!response.success) {
            setError(response.error || 'Sync failed!');
            return;
        }

        setResult(response);
        setTimeout(() => {
            setIsModalOpen(false);
        }, 3000);
    }, [selectedProjects, selectedTargets]);

    const handleClose = React.useCallback((): void => {
        setProjects([]);
        setSelectedProjects(new Set());
        setSelectedTargets(new Set(ALL_SYNC_TARGETS));
        setError(null);
        setResult(null);
    }, []);

    const canSync: boolean = selectedProjects.size > 0 && selectedTargets.size > 0 && !isSyncing;

    return (
        <>
            <Button variant={'ghost'} size={'icon'} onClick={handleOpen} className={'size-8'} title={'Sync data'}>
                <HiOutlineCloudUpload className={'size-4'}/>
            </Button>

            <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen} onClose={handleClose}>
                <div className={'p-6'}>
                    <h2 className={'text-base font-semibold text-text'}>{'Sync Data'}</h2>
                    <p className={'text-sm text-text-muted mt-1'}>Select projects and data types to sync from your local machine</p>

                    {/* Targets section */}
                    <div className={'mt-4'}>
                        <h3 className={'text-sm font-medium text-text mb-2'}>{'Data Types'}</h3>
                        <label className={'flex items-center gap-4 px-2 py-1.5 rounded-md hover:bg-border cursor-pointer'}>
                            <input type={'checkbox'} checked={allTargetsSelected} onChange={handleToggleAllTargets} className={'accent-primary size-4'}/>
                            <span className={'text-sm text-text font-medium'}>Select All</span>
                        </label>
                        {ALL_SYNC_TARGETS.map((target: SyncTarget) => (
                            <label key={target} className={'flex items-center gap-4 px-2 py-1.5 pl-6 rounded-md hover:bg-border cursor-pointer'}>
                                <input type={'checkbox'} checked={selectedTargets.has(target)} onChange={() => handleToggleTarget(target)} className={'accent-primary size-4'}/>
                                <span className={'text-sm text-text capitalize'}>{target}</span>
                            </label>
                        ))}
                    </div>

                    {/* Projects section */}
                    <div className={'mt-4'}>
                        <h3 className={'text-sm font-medium text-text mb-2'}>{'Projects'}</h3>
                        {isLoadingProjects && (
                            <p className={'text-sm text-text-muted px-2 py-1.5'}>{'Loading projects...'}</p>
                        )}
                        {(!isLoadingProjects && projects.length === 0 && !error) && (
                            <p className={'text-sm text-text-muted px-2 py-1.5'}>{'No local projects found.'}</p>
                        )}
                        {(!isLoadingProjects && projects.length > 0) && (
                            <div className={'max-h-48 overflow-y-auto'}>
                                <label className={'flex items-center gap-4 px-2 py-1.5 rounded-md hover:bg-border cursor-pointer'}>
                                    <input type={'checkbox'} checked={allProjectsSelected} onChange={handleToggleAllProjects} className={'accent-primary size-4'}/>
                                    <span className={'text-sm text-text font-medium'}>Select All</span>
                                </label>
                                {projects.map((projectDir: string) => {
                                    return (
                                        <label key={projectDir} className={'flex items-center gap-4 px-2 py-1.5 pl-6 rounded-md hover:bg-border cursor-pointer'}>
                                            <input type={'checkbox'} checked={selectedProjects.has(projectDir)} onChange={() => handleToggleProject(projectDir)} className={'accent-primary size-4'}/>
                                            <span className={'text-sm text-text'} title={projectDir}>{projectDir}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                    )}

                    {/* Result */}
                    {result && (
                        <div className={'mt-3 bg-success/10 px-3 py-2 rounded-md text-sm text-success'}>
                            <p className={'font-medium'}>{result.message || 'Sync complete!'}</p>
                            {result.sessions && (
                                <p className={'text-xs mt-1'}>
                                    {`Sessions — synced: ${result.sessions.synced}, new messages: ${result.sessions.newMessages}, skipped: ${result.sessions.skipped}`}
                                    {result.sessions.errors > 0 && `, errors: ${result.sessions.errors}`}
                                </p>
                            )}
                            {result.tasks && (
                                <p className={'text-xs mt-0.5'}>{`Tasks — new: ${result.tasks.synced}, updated: ${result.tasks.updated}`}</p>
                            )}
                            {result.memories && (
                                <p className={'text-xs mt-0.5'}>{`Memories — new: ${result.memories.synced}, updated: ${result.memories.updated}`}</p>
                            )}
                        </div>
                    )}

                    {/* Footer */}
                    <div className={'flex items-center justify-end gap-2 mt-5'}>
                        <Button variant={'ghost'} size={'sm'} onClick={() => setIsModalOpen(false)} disabled={isSyncing}>
                            {'Cancel'}
                        </Button>
                        <Button variant={'primary'} size={'sm'} onClick={handleSync} isLoading={isSyncing} disabled={!canSync}>
                            {'Sync'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export {SyncButton};
