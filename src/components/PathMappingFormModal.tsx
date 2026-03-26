"use client";

import React from "react";
import {FaPlus, FaTrash} from "react-icons/fa";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import type {IPathMappingFormModalProps} from "@/types/components";
import {createPathMapping, updatePathMapping} from "@/actions/setup.actions";
import type {ICreatePathMappingResponse, IUpdatePathMappingResponse} from "@/types/setup";

function PathMappingFormModal({isOpen, onOpenChange, editingMapping, onSaved}: IPathMappingFormModalProps) {
    const isEditMode: boolean = editingMapping !== null;

    const [label, setLabel] = React.useState<string>('');
    const [paths, setPaths] = React.useState<string[]>(['', '']);
    const [canonicalIndex, setCanonicalIndex] = React.useState<number>(0);
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    // Populate form when editing
    React.useEffect(() => {
        if (editingMapping) {
            setLabel(editingMapping.label);
            setPaths([...editingMapping.paths]);
            const canonIdx: number = editingMapping.paths.indexOf(editingMapping.canonicalPath);
            setCanonicalIndex(canonIdx >= 0 ? canonIdx : 0);
        } else {
            setLabel('');
            setPaths(['', '']);
            setCanonicalIndex(0);
        }
        setError(null);
    }, [editingMapping, isOpen]);

    const handlePathChange = React.useCallback((index: number, value: string): void => {
        setPaths((prev: string[]) => {
            const updated: string[] = [...prev];
            updated[index] = value;
            return updated;
        });
    }, []);

    const handleAddPath = React.useCallback((): void => {
        setPaths((prev: string[]) => [...prev, '']);
    }, []);

    const handleRemovePath = React.useCallback((index: number): void => {
        setPaths((prev: string[]) => {
            const updated: string[] = prev.filter((_: string, i: number) => i !== index);
            return updated;
        });
        // Adjust canonical index if needed
        setCanonicalIndex((prev: number) => {
            if (index === prev) return 0;
            if (index < prev) return prev - 1;
            return prev;
        });
    }, []);

    const handleSubmit = React.useCallback(async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const trimmedPaths: string[] = paths.map((p: string) => p.trim()).filter((p: string) => p.length > 0);

        if (trimmedPaths.length < 2) {
            setError('At least 2 paths are required!');
            setIsSubmitting(false);
            return;
        }

        const canonicalPath: string = trimmedPaths[canonicalIndex] || trimmedPaths[0];

        if (isEditMode && editingMapping) {
            const response: IUpdatePathMappingResponse = await updatePathMapping({
                mappingId: editingMapping.id,
                label: label.trim(),
                paths: trimmedPaths,
                canonicalPath,
            });

            if (!response.success) {
                setError(response.error || 'Failed to update path mapping!');
                setIsSubmitting(false);
                return;
            }
        } else {
            const response: ICreatePathMappingResponse = await createPathMapping({
                label: label.trim(),
                paths: trimmedPaths,
                canonicalPath,
            });

            if (!response.success) {
                setError(response.error || 'Failed to create path mapping!');
                setIsSubmitting(false);
                return;
            }
        }

        setIsSubmitting(false);
        onOpenChange(false);
        onSaved();
    }, [isEditMode, editingMapping, label, paths, canonicalIndex, onOpenChange, onSaved]);

    const hasEnoughPaths: boolean = paths.filter((p: string) => p.trim().length > 0).length >= 2;

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <div className={'p-6'}>
                <h2 className={'text-lg font-semibold text-text mb-4'}>
                    {isEditMode ? 'Edit Path Mapping' : 'Add Path Mapping'}
                </h2>

                <form onSubmit={handleSubmit} className={'space-y-4'}>
                    {/* Label */}
                    <div>
                        <label htmlFor={'mapping-label'} className={'block text-sm font-medium text-text mb-1'}>
                            Label
                        </label>
                        <input
                            id={'mapping-label'}
                            type={'text'}
                            value={label}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
                            placeholder={'e.g. claude-lens (NodeJs)'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    {/* Paths */}
                    <div>
                        <label className={'block text-sm font-medium text-text mb-1'}>
                            Paths
                        </label>
                        <p className={'text-xs text-text-muted mb-2'}>
                            Add all absolute paths that point to the same project. Select the canonical path with the radio button.
                        </p>

                        <div className={'space-y-2'}>
                            {paths.map((p: string, index: number) => (
                                <div key={index} className={'flex items-center gap-2'}>
                                    {/* Canonical radio */}
                                    <input
                                        type={'radio'}
                                        name={'canonical'}
                                        checked={canonicalIndex === index}
                                        onChange={() => setCanonicalIndex(index)}
                                        className={'shrink-0 accent-primary'}
                                        disabled={isSubmitting}
                                        title={'Set as canonical path'}
                                    />
                                    {/* Path input */}
                                    <input
                                        type={'text'}
                                        value={p}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handlePathChange(index, e.target.value)}
                                        placeholder={'/absolute/path/to/project'}
                                        className={'flex-1 px-3 py-2 rounded-md border border-border bg-surface text-text text-sm font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                                        disabled={isSubmitting}
                                    />
                                    {/* Remove button (only if more than 2 paths) */}
                                    {paths.length > 2 && (
                                        <Button type={'button'} variant={'ghost'} size={'icon'} onClick={() => handleRemovePath(index)} disabled={isSubmitting} className={'text-text-muted hover:text-error hover:bg-error/10'}>
                                            <FaTrash className={'size-3'}/>
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add path button */}
                        <Button type={'button'} variant={'ghost'} size={'sm'} onClick={handleAddPath} disabled={isSubmitting} className={'mt-2'}>
                            <FaPlus className={'size-3'}/>
                            Add Path
                        </Button>
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
                        <Button type={'submit'} variant={'primary'} size={'md'} isLoading={isSubmitting} disabled={!label.trim() || !hasEnoughPaths || isSubmitting}>
                            {isEditMode ? 'Save' : 'Add'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

export {PathMappingFormModal};
