"use client";

import React from "react";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {renameProject} from "@/actions/project.actions";
import type {IRenameProjectResponse} from "@/types/project";
import type {IRenameProjectModalProps} from "@/types/components";

function RenameProjectModal({isOpen, onOpenChange, project, onSaved}: IRenameProjectModalProps) {
    const [name, setName] = React.useState<string>('');
    const [description, setDescription] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = React.useCallback(async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const trimmedName: string = name.trim();
        if (!trimmedName) {
            setError('Project name cannot be empty!');
            setIsSubmitting(false);
            return;
        }
        if (trimmedName.length > 100) {
            setError('Project name must be at most 100 characters!');
            setIsSubmitting(false);
            return;
        }
        if (description.length > 500) {
            setError('Description must be at most 500 characters!');
            setIsSubmitting(false);
            return;
        }

        const response: IRenameProjectResponse = await renameProject({
            projectDir: project.projectDir,
            customName: trimmedName,
            description: description.trim() || undefined,
        });

        if (!response.success || !response.project) {
            setError(response.error || 'Failed to rename project!');
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(false);
        onOpenChange(false);
        onSaved(response.project);
    }, [name, description, project.projectDir, onOpenChange, onSaved]);

    React.useEffect(() => {
        if (isOpen) {
            setName(project.customName || '');
            setDescription(project.description || '');
            setError(null);
        }
    }, [isOpen, project.customName, project.description]);

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <div className={'p-6'}>
                <h2 className={'text-lg font-semibold text-text mb-4'}>
                    Rename Project
                </h2>

                <form onSubmit={handleSubmit} className={'space-y-4'}>
                    {/* Project Name */}
                    <div>
                        <label htmlFor={'project-name'} className={'block text-sm font-medium text-text mb-1'}>
                            Project Name
                        </label>
                        <input
                            id={'project-name'}
                            type={'text'}
                            value={name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                            placeholder={'Enter project name'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isSubmitting}
                            maxLength={100}
                            autoFocus
                        />
                        <span className={'text-xs text-text-muted mt-1 block'}>{name.trim().length}/100</span>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor={'project-description'} className={'block text-sm font-medium text-text mb-1'}>
                            Description <span className={'text-text-muted font-normal'}>(optional)</span>
                        </label>
                        <textarea
                            id={'project-description'}
                            value={description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                            placeholder={'Add a brief description for this project'}
                            rows={3}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-none'}
                            disabled={isSubmitting}
                            maxLength={500}
                        />
                        <span className={'text-xs text-text-muted mt-1 block'}>{description.trim().length}/500</span>
                    </div>

                    {/* Error */}
                    {error && (
                        <p className={'text-sm text-error bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                    )}

                    {/* Actions */}
                    <div className={'flex items-center justify-end gap-2 pt-2'}>
                        <Button type={'button'} variant={'ghost'} size={'md'} onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type={'submit'} variant={'primary'} size={'md'} isLoading={isSubmitting} disabled={!name.trim() || isSubmitting}>
                            Save
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

export {RenameProjectModal};