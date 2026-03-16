"use client";

import React from "react";
import JSZip from "jszip";
import {HiOutlineUpload} from "react-icons/hi";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import type {IImportManifest} from "@/types/import";
import {getImportUrl} from "@/actions/import.actions";
import type {IImportZipButtonProps} from "@/types/components";

async function findManifestEntry(zip: JSZip): Promise<{ manifestFile: JSZip.JSZipObject; prefix: string } | null> {
    const rootManifest: JSZip.JSZipObject | null = zip.file('manifest.json');
    if (rootManifest) {
        return {manifestFile: rootManifest, prefix: ''};
    }
    const nestedPath: string | undefined = Object.keys(zip.files).find((path) => {
        const parts: string[] = path.split('/');
        return parts.length === 2 && parts[1] === 'manifest.json';
    });
    if (!nestedPath) return null;
    const nestedManifest: JSZip.JSZipObject | null = zip.file(nestedPath);
    if (!nestedManifest) return null;
    const prefix: string = nestedPath.slice(0, nestedPath.indexOf('/') + 1);
    return {manifestFile: nestedManifest, prefix};
}

async function normalizeFlatZip(zip: JSZip, prefix: string): Promise<File> {
    const flatZip: JSZip = new JSZip();
    for (const [path, entry] of Object.entries(zip.files)) {
        if (!path.startsWith(prefix) || entry.dir) continue;
        const newPath: string = path.slice(prefix.length);
        if (!newPath) continue;
        const content: ArrayBuffer = await entry.async('arraybuffer');
        flatZip.file(newPath, content);
    }
    const blob: Blob = await flatZip.generateAsync({type: 'blob'});
    return new File([blob], 'claude-lens-normalized.zip', {type: 'application/zip'});
}

function ImportZipButton({onImported}: IImportZipButtonProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [isImporting, setIsImporting] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);
    const [manifest, setManifest] = React.useState<IImportManifest | null>(null);
    const [pendingFile, setPendingFile] = React.useState<File | null>(null);
    const [remappedProjectDir, setRemappedProjectDir] = React.useState<string>('');

    const resetState = React.useCallback((): void => {
        setError(null);
        setManifest(null);
        setPendingFile(null);
        setRemappedProjectDir('');
        setIsImporting(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const handleButtonClick = React.useCallback((e: React.MouseEvent): void => {
        e.stopPropagation();
        fileInputRef.current?.click();
    }, []);

    const handleFileSelected = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file: File | undefined = e.target.files?.[0];
        if (!file) return;

        setError(null);

        try {
            const zip: JSZip = await JSZip.loadAsync(file);
            console.log('zip:', zip);
            const result: { manifestFile: JSZip.JSZipObject; prefix: string } | null = await findManifestEntry(zip);
            if (!result) {
                setError('Invalid Claude Lens backup: manifest.json missing!');
                setIsModalOpen(true);
                return;
            }

            const {manifestFile, prefix} = result;
            const normalizedFile: File = prefix ? await normalizeFlatZip(zip, prefix) : file;

            const manifestJson: string = await manifestFile.async('string');
            const parsed: IImportManifest = JSON.parse(manifestJson);

            setManifest(parsed);
            setPendingFile(normalizedFile);
            setRemappedProjectDir(parsed.projectDir);
            setIsModalOpen(true);
        } catch (err: unknown) {
            console.error('Import ZIP parse error:', err);
            setError('Failed to read ZIP file. Please ensure it is a valid Claude Lens export.');
            setIsModalOpen(true);
        }
    }, []);

    const handleConfirmImport = React.useCallback(async (): Promise<void> => {
        if (!pendingFile) return;

        setIsImporting(true);
        setError(null);

        try {
            const {success: urlSuccess, url, error: urlError} = await getImportUrl();
            if (!urlSuccess || !url) {
                setError(urlError || 'Failed to get import URL!');
                setIsImporting(false);
                return;
            }

            const formData: FormData = new FormData();
            formData.append('zip', pendingFile);
            if (remappedProjectDir && manifest && remappedProjectDir !== manifest.projectDir) {
                formData.append('projectDir', remappedProjectDir);
            }

            const response: Response = await fetch(url, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                setError(result.error?.message || 'Import failed!');
                setIsImporting(false);
                return;
            }

            setIsModalOpen(false);
            resetState();
            onImported();
        } catch (err: unknown) {
            console.error('Import error:', err);
            setError('Something went wrong during import. Please try again!');
            setIsImporting(false);
        }
    }, [pendingFile, remappedProjectDir, manifest, onImported, resetState]);

    const handleModalClose = React.useCallback((): void => {
        if (!isImporting) {
            resetState();
        }
    }, [isImporting, resetState]);

    const exportedDate: string = manifest?.exportedAt
        ? new Date(manifest.exportedAt).toLocaleDateString('en-US', {day: 'numeric', month: 'long', year: 'numeric'})
        : '';

    return (
        <>
            <input ref={fileInputRef} type={'file'} accept={'.zip'} onChange={handleFileSelected} className={'hidden'}/>

            <Button variant={'ghost'} size={'sm'} onClick={handleButtonClick} className={'p-1.5'} title={'Import from .zip'}>
                <HiOutlineUpload className={'size-3.5'}/>
            </Button>

            <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen} onClose={handleModalClose}>
                <form onSubmit={(e: React.FormEvent) => {
                    e.preventDefault();
                    void handleConfirmImport();
                }} className={'p-6'}>
                    <h2 className={'font-semibold text-center text-primary'}>Import .zip</h2>

                    {manifest && (
                        <div className={'mt-3 space-y-2'}>
                            <p className={'text-sm text-text-muted'}>
                                This backup contains
                                <span className={'ml-1 mr-0.5 font-medium text-text'}>{manifest.totalSessions}</span>
                                session(s),
                                <span className={'ml-1 mr-0.5 font-medium text-text'}>{manifest.totalMemoryFiles}</span>
                                memory file(s), and
                                <span className={'ml-1 mr-0.5 font-medium text-text'}>{manifest.totalTasks}</span>
                                task(s).
                            </p>
                            <p className={'text-sm text-text-muted'}>
                                Exported on
                                <span className={'ml-1 mr-0.5 font-medium text-text'}>{exportedDate}</span>
                                from:
                            </p>
                            <p className={'text-xs font-mono bg-background px-3 py-2 rounded-md text-text break-all'}>
                                {manifest.projectDir}
                            </p>

                            <div className={'mt-4'}>
                                <label htmlFor={'remap-project-dir'} className={'block text-sm font-medium text-text mb-1'}>
                                    Project path (adjust if restoring on a different machine)
                                </label>
                                <input
                                    id={'remap-project-dir'}
                                    type={'text'}
                                    autoFocus={true}
                                    value={remappedProjectDir}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRemappedProjectDir(e.target.value)}
                                    disabled={isImporting}
                                    className={'w-full px-3 py-2 text-sm font-mono rounded-md border border-border bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary'}
                                />
                            </div>
                        </div>
                    )}

                    {error && (
                        <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                    )}

                    <div className={'flex items-center justify-end gap-2 mt-5'}>
                        <Button type={'button'} variant={'ghost'} size={'sm'} onClick={() => setIsModalOpen(false)} disabled={isImporting}>
                            Cancel
                        </Button>
                        <Button variant={'primary'} size={'sm'} onClick={handleConfirmImport} isLoading={isImporting} disabled={!remappedProjectDir.trim()}>
                            Import
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
}

export {ImportZipButton};
