"use client";

import {useEffect} from "react";
import {Button} from "@/components/ui/Button";

function AppError({error, reset}: { error: Error; reset: () => void; }) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className={'flex flex-col items-center justify-center h-full gap-4 text-center px-6'}>
            <span className={'text-4xl'}>💥</span>
            <h2 className={'text-base font-semibold text-text'}>Something went wrong</h2>
            <p className={'text-sm text-text-muted max-w-sm'}>{error.message || 'An unexpected error occurred!'}</p>
            <Button variant={'primary'} size={'sm'} onClick={reset} className={'mt-2'}>
                Try again
            </Button>
        </div>
    );
}

export default AppError;
