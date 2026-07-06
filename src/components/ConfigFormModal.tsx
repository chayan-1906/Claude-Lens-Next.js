"use client";

import React from "react";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import type {IConfigFormModalProps} from "@/types/components";
import {addConfiguration, editConfiguration, testConfiguration} from "@/actions/setup.actions";
import type {IAddConfigurationResponse, IEditConfigurationResponse, ITestConfigurationResponse} from "@/types/setup";

type TTestStatus = 'idle' | 'testing' | 'success' | 'error';

function ConfigFormModal({isOpen, onOpenChange, editingConfig, onSaved}: IConfigFormModalProps) {
    const isEditMode: boolean = editingConfig !== null;

    const [name, setName] = React.useState<string>('');
    const [uri, setUri] = React.useState<string>('');
    const [description, setDescription] = React.useState<string>('');
    const [color, setColor] = React.useState<string>('#4A90D9');
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [testStatus, setTestStatus] = React.useState<TTestStatus>('idle');
    const [testError, setTestError] = React.useState<string | null>(null);

    const handleTestConnection = React.useCallback(async (): Promise<void> => {
        if (!editingConfig) return;

        setTestStatus('testing');
        setTestError(null);

        const response: ITestConfigurationResponse = await testConfiguration({configId: editingConfig.id});

        if (response.success) {
            setTestStatus('success');
        } else {
            setTestStatus('error');
            setTestError(response.error || 'Connection test failed!');
        }
    }, [editingConfig]);

    const handleSubmit = React.useCallback(async (formEvent: React.FormEvent): Promise<void> => {
        formEvent.preventDefault();
        setIsSubmitting(true);
        setError(null);

        if (isEditMode && editingConfig) {
            const response: IEditConfigurationResponse = await editConfiguration({
                configId: editingConfig.id,
                name: name.trim(),
                uri: uri.trim(),
                description: description.trim() || undefined,
                color,
            });

            if (!response.success) {
                setError(response.error || 'Failed to update configuration!');
                setIsSubmitting(false);
                return;
            }
        } else {
            const response: IAddConfigurationResponse = await addConfiguration({
                name: name.trim(),
                uri: uri.trim(),
                description: description.trim() || undefined,
                color,
            });

            if (!response.success) {
                setError(response.error || 'Failed to add configuration!');
                setIsSubmitting(false);
                return;
            }
        }

        setIsSubmitting(false);
        onOpenChange(false);
        onSaved();
    }, [isEditMode, editingConfig, name, uri, description, color, onOpenChange, onSaved]);

    // Populate form when editing
    React.useEffect(() => {
        if (editingConfig) {
            setName(editingConfig.name);
            setUri(editingConfig.uri);
            setDescription(editingConfig.description || '');
            setColor(editingConfig.color);
        } else {
            setName('');
            setUri('');
            setDescription('');
            setColor(`#${Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0')}`);
        }
        setError(null);
        setTestStatus('idle');
        setTestError(null);
    }, [editingConfig, isOpen]);

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <div className={'p-6'}>
                <h2 className={'text-lg font-semibold text-text mb-4'}>
                    {isEditMode ? 'Edit Configuration' : 'Add Configuration'}
                </h2>

                <form onSubmit={handleSubmit} className={'space-y-4'}>
                    {/* Name */}
                    <div>
                        <label htmlFor={'config-name'} className={'block text-sm font-medium text-text mb-1'}>
                            Name
                        </label>
                        <input
                            id={'config-name'}
                            type={'text'}
                            value={name}
                            onChange={(changeEvent: React.ChangeEvent<HTMLInputElement>) => setName(changeEvent.target.value)}
                            placeholder={'e.g. Production, Staging, Local'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isSubmitting}
                            autoFocus
                        />
                    </div>

                    {/* URI */}
                    <div>
                        <label htmlFor={'config-uri'} className={'block text-sm font-medium text-text mb-1'}>
                            MongoDB Connection String
                        </label>
                        <input
                            id={'config-uri'}
                            type={'text'}
                            value={uri}
                            onChange={(changeEvent: React.ChangeEvent<HTMLInputElement>) => setUri(changeEvent.target.value)}
                            placeholder={'mongodb+srv://user:password@cluster.mongodb.net/dbname'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor={'config-description'} className={'block text-sm font-medium text-text mb-1'}>
                            Description <span className={'text-text-muted font-normal'}>(optional)</span>
                        </label>
                        <textarea
                            id={'config-description'}
                            value={description}
                            onChange={(changeEvent: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(changeEvent.target.value)}
                            placeholder={'e.g. Main production cluster'}
                            className={'w-full px-3 py-2 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Color */}
                    <div>
                        <label htmlFor={'config-color'} className={'block text-sm font-medium text-text mb-1'}>
                            Color
                        </label>
                        <div className={'flex items-center gap-3'}>
                            <input
                                id={'config-color'}
                                type={'color'}
                                value={color}
                                onChange={(changeEvent: React.ChangeEvent<HTMLInputElement>) => setColor(changeEvent.target.value)}
                                className={'size-9 rounded-md border border-border cursor-pointer bg-transparent'}
                                disabled={isSubmitting}
                            />
                            <span className={'text-xs text-text-muted font-mono'}>{color}</span>
                        </div>
                    </div>

                    {/* Test Connection (only in edit mode, since add validates on submit) */}
                    {isEditMode && (
                        <div>
                            <Button type={'button'} variant={'outline'} size={'sm'} onClick={handleTestConnection} isLoading={testStatus === 'testing'} disabled={testStatus === 'testing'}>
                                Test Connection
                            </Button>
                            {testStatus === 'success' && (
                                <p className={'text-xs text-success mt-1.5'}>Connection test passed!</p>
                            )}
                            {testStatus === 'error' && (
                                <p className={'text-xs text-error mt-1.5'}>{testError}</p>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <p className={'text-sm text-error bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                    )}

                    {/* Actions */}
                    <div className={'flex items-center justify-end gap-2 pt-2'}>
                        <Button type={'button'} variant={'ghost'} size={'md'} onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type={'submit'} variant={'primary'} size={'md'} isLoading={isSubmitting} disabled={!name.trim() || !uri.trim() || isSubmitting}>
                            {isEditMode ? 'Save' : 'Add'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

export {ConfigFormModal};
