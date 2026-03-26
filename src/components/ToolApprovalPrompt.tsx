"use client";

import React from "react";
import {HiOutlineCheck, HiOutlineX, HiOutlineCheckCircle} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import {DiffView} from "@/components/DiffView";
import type {IToolApprovalPromptProps} from "@/types/components";

function ToolApprovalPrompt({approval, onRespond}: IToolApprovalPromptProps) {
    const {requestId, toolName, toolInput} = approval;
    const isRead: boolean = toolName === 'Read';
    const isBash: boolean = toolName === 'Bash';
    const isMcp: boolean = toolName.startsWith('mcp__');
    const isFileOp: boolean = !isBash && !isMcp && !isRead && ('file_path' in toolInput || 'notebook_path' in toolInput);
    const isGenericTool: boolean = !isBash && !isMcp && !isRead && !isFileOp;
    const filePath: string = (isFileOp || isRead) ? ((toolInput.file_path as string) ?? (toolInput.notebook_path as string) ?? '') : '';
    const bashCommand: string = isBash ? ((toolInput.command as string) ?? '') : '';
    const mcpParts: string[] = isMcp ? toolName.split('__') : [];
    const mcpServerName: string = mcpParts[1] ?? '';
    const mcpToolName: string = mcpParts.slice(2).join('__');

    const [showDenyInput, setShowDenyInput] = React.useState<boolean>(false);
    const [customReason, setCustomReason] = React.useState<string>('');

    const headerLabel: string = isBash
        ? 'Run command?'
        : isRead
            ? 'Read file?'
            : isMcp || isGenericTool
                ? 'Use tool?'
                : toolName === 'Write'
                    ? 'Create file?'
                    : 'Edit file?';

    const defaultReason: string = isBash
        ? 'User denied the command'
        : isRead
            ? 'User denied the read'
            : (isMcp || isGenericTool)
                ? 'User denied the tool call'
                : 'User denied the edit';

    const handleApprove = React.useCallback((): void => {
        onRespond(requestId, 'allow');
    }, [requestId, onRespond]);

    const handleAllowAll = React.useCallback((): void => {
        onRespond(requestId, 'allow', undefined, true);
    }, [requestId, onRespond]);

    const handleDenyClick = React.useCallback((): void => {
        setShowDenyInput(true);
    }, []);

    const handleConfirmDeny = React.useCallback((): void => {
        const finalReason: string = customReason.trim() || defaultReason;
        onRespond(requestId, 'deny', finalReason);
        setShowDenyInput(false);
        setCustomReason('');
    }, [requestId, onRespond, customReason, defaultReason]);

    const handleCancelDeny = React.useCallback((): void => {
        setShowDenyInput(false);
        setCustomReason('');
    }, []);

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleConfirmDeny();
        } else if (e.key === 'Escape') {
            handleCancelDeny();
        }
    }, [handleConfirmDeny, handleCancelDeny]);

    return (
        <div className={'flex flex-col items-start w-full'}>
            <div className={'max-w-[85%] w-full rounded-2xl border border-warning/30 bg-warning/5 overflow-hidden'}>
                {/* Header */}
                <div className={'flex items-center gap-2 px-4 py-2.5 border-b border-warning/20 bg-warning/10'}>
                    <span className={'text-sm font-medium text-warning'}>
                        {headerLabel}
                    </span>
                    {isMcp ? (
                        <>
                            <span className={'text-xs font-mono text-text-muted truncate flex-1'} title={mcpToolName}>{mcpToolName}</span>
                            <span className={'text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase'} title={mcpServerName}>{mcpServerName}</span>
                        </>
                    ) : isGenericTool ? (
                        <span className={'text-xs font-mono text-text-muted truncate flex-1'} title={toolName}>{toolName}</span>
                    ) : (isFileOp || isRead) ? (
                        <span className={'text-xs text-text-muted font-mono truncate flex-1'} title={filePath}>{filePath}</span>
                    ) : null}
                </div>

                {/* Content */}
                <div className={'p-3'}>
                    {isRead ? (
                        <div className={'rounded-lg border border-border overflow-hidden bg-surface'}>
                            <div className={'flex items-center gap-2 px-4 py-3'}>
                                <span className={'text-xs font-mono text-text truncate'} title={filePath}>{filePath}</span>
                                <span className={'text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/15 text-primary uppercase shrink-0'}>READ</span>
                            </div>
                        </div>
                    ) : isBash ? (
                        <div className={'rounded-lg border border-primary/30 overflow-hidden bg-surface'}>
                            <pre className={'px-4 py-3 text-xs font-mono text-text overflow-x-auto'}>{bashCommand}</pre>
                        </div>
                    ) : (isMcp || isGenericTool) ? (
                        <div className={'rounded-lg border border-border overflow-hidden bg-surface'}>
                            <pre className={'px-4 py-3 text-xs font-mono text-text overflow-x-auto max-h-80 overflow-y-auto'}>
                                {JSON.stringify(toolInput, null, 2)}
                            </pre>
                        </div>
                    ) : (
                        <DiffView
                            toolName={toolName}
                            filePath={filePath}
                            oldString={toolInput.old_string as string | undefined}
                            newString={toolInput.new_string as string | undefined}
                            content={toolInput.content as string | undefined}
                            replaceAll={toolInput.replace_all as boolean | undefined}
                        />
                    )}
                </div>

                {/* Deny reason input */}
                {showDenyInput && (
                    <div className={'px-3 pb-3'}>
                        <textarea
                            autoFocus
                            value={customReason}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => setCustomReason(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={'Why? e.g. use Edit instead, wrong file path...'}
                            rows={2}
                            className={'w-full rounded-lg border border-error/40 bg-surface px-3 py-2 text-xs text-text placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-error/50'}
                        />
                    </div>
                )}

                {/* Action buttons */}
                <div className={'flex items-center gap-2 px-4 py-3 border-t border-warning/20'}>
                    <Button variant={'primary'} size={'sm'} onClick={handleApprove} className={'gap-1.5'}>
                        <HiOutlineCheck className={'size-3.5'}/>
                        Approve
                    </Button>
                    <Button variant={'outline'} size={'sm'} onClick={handleAllowAll} className={'gap-1.5'}>
                        <HiOutlineCheckCircle className={'size-3.5'}/>
                        Allow All
                    </Button>
                    {showDenyInput ? (
                        <>
                            <Button variant={'danger'} size={'sm'} onClick={handleConfirmDeny} className={'gap-1.5'}>
                                <HiOutlineX className={'size-3.5'}/>
                                Confirm Deny
                            </Button>
                            <Button variant={'ghost'} size={'sm'} onClick={handleCancelDeny}>
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <Button variant={'danger'} size={'sm'} onClick={handleDenyClick} className={'gap-1.5'}>
                            <HiOutlineX className={'size-3.5'}/>
                            Deny
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

export {ToolApprovalPrompt};
