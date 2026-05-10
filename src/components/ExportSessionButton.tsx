"use client";

import React from "react";
import {HiOutlineDownload} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import {getExportUrl} from "@/actions/export.actions";
import type {IExportSessionButtonProps} from "@/types/components";

function ExportSessionButton({projectDir, sessionId}: IExportSessionButtonProps) {
    const [isExporting, setIsExporting] = React.useState<boolean>(false);

    const handleExport = React.useCallback(async (mouseEvent: React.MouseEvent): Promise<void> => {
        mouseEvent.stopPropagation();
        setIsExporting(true);

        try {
            const {success, url, error} = await getExportUrl({projectDir, sessionId});
            if (!success || !url) {
                console.error('Export URL error:', error);
                return;
            }

            const a: HTMLAnchorElement = document.createElement('a');
            a.href = url;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error: unknown) {
            console.error('Export error:', error);
        } finally {
            setIsExporting(false);
        }
    }, [projectDir, sessionId]);

    return (
        <Button variant={'ghost'} size={'sm'} onClick={handleExport} disabled={isExporting}   aria-label={'Export session as .zip'} title={'Export session as .zip'} className={'p-1.5 rounded-md text-text-muted hover:text-primary'}>
            <HiOutlineDownload className={'size-4'}/>
        </Button>
    );
}

export {ExportSessionButton};
