"use client";

import React from "react";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {getSessionPdfUrl} from "@/actions/pdf.actions";
import type {IGetSessionPdfUrlResponse} from "@/types/pdf";
import type {IDownloadSessionPdfModalProps} from "@/types/components";
import {parseApiResponse, ApiResponseClass} from "@/utils/ApiResponse";

function DownloadSessionPdfModal({isOpen, onOpenChange, sessionId}: IDownloadSessionPdfModalProps) {
    const [includeThinking, setIncludeThinking] = React.useState<boolean>(false);
    const [includeTools, setIncludeTools] = React.useState<boolean>(false);
    const [isDownloading, setIsDownloading] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleDownload = React.useCallback(async (event: React.FormEvent): Promise<void> => {
        event.preventDefault();
        setIsDownloading(true);
        setError(null);

        try {
            const urlResponse: IGetSessionPdfUrlResponse = await getSessionPdfUrl({sessionId, includeThinking, includeTools});
            if (!urlResponse.success || !urlResponse.url) {
                setError(urlResponse.error || 'Failed to build the PDF URL!');
                setIsDownloading(false);
                return;
            }

            const pdfResponse: Response = await fetch(urlResponse.url);
            if (!pdfResponse.ok) {
                const contentType: string = pdfResponse.headers.get('content-type') ?? '';
                let serverMessage: string = `Server responded with ${pdfResponse.status}`;
                if (contentType.includes('application/json')) {
                    try {
                        const errorBody: ApiResponseClass = await parseApiResponse(pdfResponse);
                        if (errorBody.error?.message) {
                            serverMessage = errorBody.error.message;
                        }
                    } catch (parseError: unknown) {
                        // keep default serverMessage
                    }
                }
                setError(serverMessage);
                setIsDownloading(false);
                return;
            }

            const disposition: string = pdfResponse.headers.get('content-disposition') ?? '';
            const filenameMatch: RegExpMatchArray | null = disposition.match(/filename="?([^"]+)"?/);
            const filename: string = filenameMatch ? filenameMatch[1] : `claude-lens-session-${sessionId.slice(0, 8)}.pdf`;

            const blob: Blob = await pdfResponse.blob();
            const blobUrl: string = URL.createObjectURL(blob);
            const anchor: HTMLAnchorElement = document.createElement('a');
            anchor.href = blobUrl;
            anchor.download = filename;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(blobUrl);

            setIsDownloading(false);
            onOpenChange(false);
        } catch (downloadError: unknown) {
            console.error('PDF download error:', downloadError);
            setError('Something went wrong while downloading the PDF!');
            setIsDownloading(false);
        }
    }, [sessionId, includeThinking, includeTools, onOpenChange]);

    React.useEffect(() => {
        if (isOpen) {
            setIncludeThinking(false);
            setIncludeTools(false);
            setError(null);
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <div className={'p-6'}>
                <h2 className={'text-lg font-semibold text-text mb-1'}>Download session as PDF</h2>
                <p className={'text-sm text-text-muted mb-4'}>
                    Choose what to include. Defaults to a clean chat view (your messages and the assistant&rsquo;s text replies).
                </p>

                <form onSubmit={handleDownload} className={'space-y-4'}>
                    {/* Include thinking */}
                    <label className={'flex items-start gap-3 p-3 rounded-md border border-border bg-surface cursor-pointer hover:bg-border/30 transition-colors'}>
                        <input
                            type={'checkbox'}
                            checked={includeThinking}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIncludeThinking(event.target.checked)}
                            disabled={isDownloading}
                            className={'mt-0.5 size-4 cursor-pointer accent-primary'}
                        />
                        <span className={'flex-1'}>
                            <span className={'block text-sm font-medium text-text'}>Include thinking blocks</span>
                            <span className={'block text-xs text-text-muted mt-0.5'}>The assistant&rsquo;s internal reasoning, shown in gold-tinted callouts.</span>
                        </span>
                    </label>

                    {/* Include tools */}
                    <label className={'flex items-start gap-3 p-3 rounded-md border border-border bg-surface cursor-pointer hover:bg-border/30 transition-colors'}>
                        <input
                            type={'checkbox'}
                            checked={includeTools}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setIncludeTools(event.target.checked)}
                            disabled={isDownloading}
                            className={'mt-0.5 size-4 cursor-pointer accent-primary'}
                        />
                        <span className={'flex-1'}>
                            <span className={'block text-sm font-medium text-text'}>Include tool calls and results</span>
                            <span className={'block text-xs text-text-muted mt-0.5'}>Each tool_use card and its matching tool_result content, rendered inline.</span>
                        </span>
                    </label>

                    {/* Error */}
                    {error && (
                        <p className={'text-sm text-error bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                    )}

                    {/* Actions */}
                    <div className={'flex items-center justify-end gap-2 pt-2'}>
                        <Button type={'button'} variant={'ghost'} size={'md'} onClick={() => onOpenChange(false)} disabled={isDownloading}>
                            Cancel
                        </Button>
                        <Button type={'submit'} variant={'primary'} size={'md'} isLoading={isDownloading}>
                            Download PDF
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

export {DownloadSessionPdfModal};
