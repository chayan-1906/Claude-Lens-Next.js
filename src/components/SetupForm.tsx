"use client";

import React from "react";
import {Button} from "@/components/ui/Button";
import {setup} from "@/actions/setup.actions";
import type {ISetupResponse} from "@/types/setup";

function SetupForm() {
    const [mongoUri, setMongoUri] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSubmit = React.useCallback(async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const response: ISetupResponse = await setup({mongoUri: mongoUri.trim()});

        if (!response.success) {
            setError(response.error || 'Setup failed!');
            setIsSubmitting(false);
            return;
        }
    }, [mongoUri]);

    return (
        <form onSubmit={handleSubmit} className={'mt-6'}>
            <label htmlFor={'mongo-uri'} className={'block text-sm font-medium text-text mb-1.5'}>
                MongoDB Connection String
            </label>
            <input
                id={'mongo-uri'}
                type={'text'}
                value={mongoUri}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMongoUri(e.target.value)}
                placeholder={'mongodb+srv://user:password@cluster.mongodb.net/dbname'}
                className={'w-full px-3 py-2.5 rounded-md border border-border bg-surface text-text text-sm placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary'}
                disabled={isSubmitting}
                autoFocus
            />

            {error && (
                <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
            )}

            <Button type={'submit'} variant={'primary'} size={'md'} isLoading={isSubmitting} disabled={!mongoUri.trim() || isSubmitting} className={'w-full mt-4'}>
                Connect
            </Button>
        </form>
    );
}

export {SetupForm};
