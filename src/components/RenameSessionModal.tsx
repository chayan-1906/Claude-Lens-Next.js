"use client";

import React from "react";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {updateSession} from "@/actions/session.actions";
import type {IUpdateSessionResponse} from "@/types/session";
import type {IRenameSessionModalProps} from "@/types/components";

function RenameSessionModal({isOpen, onOpenChange, session, onSaved}: IRenameSessionModalProps) {
    const [title, setTitle] = React.useState<string>('');
    const [description, setDescription] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = React.useCallback(async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const trimmedTitle: string = title.trim();
        if (!trimmedTitle) {
            setError('Session name cannot be empty!');
            setIsSubmitting(false);
            return;
        }
        if (trimmedTitle.length > 100) {
            setError('Session name must be at most 100 characters!');
            setIsSubmitting(false);
            return;
        }
        if (description.length > 500) {
            setError('Description must be at most 500 characters!');
            setIsSubmitting(false);
            return;
        }

        const response: IUpdateSessionResponse = await updateSession({
            sessionId: session.sessionId,
            title: trimmedTitle,
            description: description.trim(),
        });

        if (!response.success || !response.session) {
            setError(response.error || 'Failed to update session!');
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(false);
        onOpenChange(false);
        onSaved(response.session);
    }, [title, description, session.sessionId, onOpenChange, onSaved]);

    // Populate form when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setTitle(session.title);
            setDescription(session.description || '');
            setError(null);
        }
    }, [isOpen, session.title, session.description]);

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <div className={'p-6'}>
                <h2 className={'text-lg font-semibold text-text mb-4'}>
                    Rename Session
                </h2>

                <form onSubmit={handleSubmit} className={'space-y-4'}>
                    {/* Session Name */}
                    <div>
                        <label htmlFor={'session-title'} className={'block text-sm font-medium text-text mb-1'}>
                            Session Name
                        </label>
                        <input
                            id={'session-title'}
                            type={'text'}
                            value={title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                            placeholder={'Enter session name'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isSubmitting}
                            maxLength={100}
                            autoFocus
                        />
                        <span className={'text-xs text-text-muted mt-1 block'}>{title.trim().length}/100</span>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor={'session-description'} className={'block text-sm font-medium text-text mb-1'}>
                            Description <span className={'text-text-muted font-normal'}>(optional)</span>
                        </label>
                        <textarea
                            id={'session-description'}
                            value={description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                            placeholder={'Add a brief description for this session'}
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
                        <Button type={'submit'} variant={'primary'} size={'md'} isLoading={isSubmitting} disabled={!title.trim() || isSubmitting}>
                            Save
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

export {RenameSessionModal};
