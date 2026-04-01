"use client";

import React from "react";

function useDocumentTitle(title: string): void {
    React.useEffect((): (() => void) => {
        document.title = title ? `${title} | Claude Lens` : 'Claude Lens';
        return (): void => {
            document.title = 'Claude Lens';
        };
    }, [title]);
}

export default useDocumentTitle;
