"use client";

import React from "react";
import {search} from "@/actions/search.actions";
import {ISearchResponse, TSearchScope} from "@/types/search";

const DEBOUNCE_MS: number = 300;
const MIN_QUERY_LEN: number = 2;

function useSearch(scope: TSearchScope, sessionId: string | undefined, projectDir: string | undefined) {
    const [query, setQuery] = React.useState<string>('');
    const [results, setResults] = React.useState<ISearchResponse | null>(null);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const reset = React.useCallback((): void => {
        setQuery('');
        setResults(null);
        setError(null);
        setIsLoading(false);
    }, []);

    React.useEffect(() => {
        setResults(null);
        setError(null);
    }, [scope]);

    React.useEffect(() => {
        const trimmed: string = query.trim();

        if (trimmed.length < MIN_QUERY_LEN) {
            setResults(null);
            setError(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        const timeout: ReturnType<typeof setTimeout> = setTimeout(async () => {
            const results: ISearchResponse = await search({q: trimmed, scope, sessionId, projectDir, limit: 20});
            const {success, message, messages, sessions, tasks, memories, error} = results;
            if (success) {
                setResults(results ?? null);
                setError(null);
            } else {
                setError(error ?? 'Search failed');
                setResults(null);
            }
            setIsLoading(false);
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timeout);
        };
    }, [query, scope, sessionId, projectDir]);

    return {query, setQuery, results, isLoading, error, reset};
}

export {useSearch};
