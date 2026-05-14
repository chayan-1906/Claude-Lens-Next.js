"use client";

import React from "react";
import {FaRegFilePdf} from "react-icons/fa";
import {HiDotsVertical, HiOutlineDownload, HiOutlineTrash} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import {getExportUrl} from "@/actions/export.actions";
import type {IGetExportUrlResponse} from "@/types/export";
import type {ISessionActionsMenuProps} from "@/types/components";
import {DeleteSessionModal} from "@/components/DeleteSessionModal";
import {DownloadSessionPdfModal} from "@/components/DownloadSessionPdfModal";

function SessionActionsMenu({sessionId, sessionTitle, projectDir, r2Configured}: ISessionActionsMenuProps) {
    const [isMenuOpen, setIsMenuOpen] = React.useState<boolean>(false);
    const [isPdfModalOpen, setIsPdfModalOpen] = React.useState<boolean>(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState<boolean>(false);
    const [isExporting, setIsExporting] = React.useState<boolean>(false);

    const handleToggleMenu = React.useCallback((mouseEvent: React.MouseEvent): void => {
        mouseEvent.stopPropagation();
        setIsMenuOpen((previous: boolean) => !previous);
    }, []);

    const handleOpenPdfModal = React.useCallback((mouseEvent: React.MouseEvent): void => {
        mouseEvent.stopPropagation();
        setIsMenuOpen(false);
        setIsPdfModalOpen(true);
    }, []);

    const handleOpenDeleteModal = React.useCallback((mouseEvent: React.MouseEvent): void => {
        mouseEvent.stopPropagation();
        setIsMenuOpen(false);
        setIsDeleteModalOpen(true);
    }, []);

    const handleExport = React.useCallback(async (mouseEvent: React.MouseEvent): Promise<void> => {
        mouseEvent.stopPropagation();
        setIsMenuOpen(false);
        setIsExporting(true);

        try {
            const {success, url, error}: IGetExportUrlResponse = await getExportUrl({projectDir, sessionId});
            if (!success || !url) {
                console.error('Export URL error:', error);
                return;
            }

            const anchor: HTMLAnchorElement = document.createElement('a');
            anchor.href = url;
            anchor.download = '';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
        } catch (exportError: unknown) {
            console.error('Export error:', exportError);
        } finally {
            setIsExporting(false);
        }
    }, [projectDir, sessionId]);

    React.useEffect(() => {
        if (!isMenuOpen) {
            return;
        }
        const handler = (): void => setIsMenuOpen(false);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [isMenuOpen]);

    return (
        <div className={'relative'}>
            <Button variant={'ghost'} size={'sm'} onClick={handleToggleMenu} className={'p-1.5 rounded-md text-text-muted hover:text-text'} aria-label={'Session options'}
                    title={'Session options'}>
                <HiDotsVertical className={'size-3.5'}/>
            </Button>
            {isMenuOpen && (
                <div className={'absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-md shadow-md z-50 py-1'}>
                    <Button type={'button'} variant={'ghost'} size={'sm'} onClick={handleOpenPdfModal}
                            className={'flex items-center justify-start gap-2 w-full px-3 py-1.5 text-xs text-text hover:bg-border transition-colors rounded-none'}>
                        <FaRegFilePdf className={'size-3.5 shrink-0'}/>
                        Download PDF
                    </Button>
                    <Button type={'button'} variant={'ghost'} size={'sm'} onClick={handleExport} disabled={isExporting}
                            className={'flex items-center justify-start gap-2 w-full px-3 py-1.5 text-xs text-text hover:bg-border transition-colors rounded-none'}>
                        <HiOutlineDownload className={'size-3.5 shrink-0'}/>
                        {isExporting ? 'Exporting...' : 'Export'}
                    </Button>
                    <Button type={'button'} variant={'ghost'} size={'sm'} onClick={handleOpenDeleteModal}
                            className={'flex items-center justify-start gap-2 w-full px-3 py-1.5 text-xs text-error hover:bg-error/10 transition-colors rounded-none'}>
                        <HiOutlineTrash className={'size-3.5 shrink-0'}/>
                        Delete
                    </Button>
                </div>
            )}
            <DownloadSessionPdfModal isOpen={isPdfModalOpen} onOpenChange={setIsPdfModalOpen} sessionId={sessionId}/>
            <DeleteSessionModal isOpen={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen} sessionId={sessionId} sessionTitle={sessionTitle} r2Configured={r2Configured}/>
        </div>
    );
}

export {SessionActionsMenu};
