"use client";

import React from "react";
import {HiOutlineDownload} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import {getExportUrl} from "@/actions/export.actions";
import type {IExportProjectButtonProps} from "@/types/components";

function ExportProjectButton({projectDir}: IExportProjectButtonProps) {
    const [isExporting, setIsExporting] = React.useState<boolean>(false);

    const handleExport = React.useCallback(async (e: React.MouseEvent): Promise<void> => {
        e.stopPropagation();
        setIsExporting(true);

        try {
            const {success, url, error} = await getExportUrl({projectDir});
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
    }, [projectDir]);

    return (
        <Button variant={'ghost'} size={'sm'} onClick={handleExport} disabled={isExporting} aria-label={'Export project as .zip'} title={'Export project as .zip'}
                className={'p-1.5 rounded-md text-text-muted hover:text-primary'}>
            <HiOutlineDownload className={'size-4'}/>
        </Button>
    );
}

export {ExportProjectButton};
