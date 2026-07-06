"use client";

import React from "react";

const FLASH_INTERVAL_MS: number = 1_000;
const APPROVAL_FLASH_TITLE: string = '⚠️ Approval Needed!';

function useDocumentTitle(title: string, isApprovalPending: boolean = false): void {
    React.useEffect((): (() => void) => {
        const baseTitle: string = title ? `${title} | Claude Lens` : 'Claude Lens';

        if (!isApprovalPending) {
            document.title = baseTitle;
            return (): void => {
                document.title = 'Claude Lens';
            };
        }

        // Flash the tab title when approval is pending and the tab is hidden
        let intervalId: ReturnType<typeof setInterval> | null = null;
        let isFlashOn: boolean = false;

        const startFlashing = (): void => {
            if (intervalId !== null) return;
            intervalId = setInterval((): void => {
                isFlashOn = !isFlashOn;
                document.title = isFlashOn ? `${APPROVAL_FLASH_TITLE} | Claude Lens` : baseTitle;
            }, FLASH_INTERVAL_MS);
        }

        const stopFlashing = (): void => {
            if (intervalId !== null) {
                clearInterval(intervalId);
                intervalId = null;
            }
            isFlashOn = false;
            document.title = baseTitle;
        }

        const handleVisibilityChange = (): void => {
            if (document.visibilityState === 'hidden') {
                startFlashing();
            } else {
                stopFlashing();
            }
        }

        // Start flashing immediately if the tab is already hidden when approval arrives
        if (document.visibilityState === 'hidden') {
            startFlashing();
        } else {
            document.title = baseTitle;
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return (): void => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            stopFlashing();
            document.title = 'Claude Lens';
        };
    }, [title, isApprovalPending]);
}

export default useDocumentTitle;
