"use client";

import React from "react";
import {HiOutlineCheck, HiOutlineX, HiOutlineCheckCircle} from "react-icons/hi";
import {Button} from "@/components/ui/Button";
import {DiffView} from "@/components/DiffView";
import type {IToolApprovalPromptProps} from "@/types/components";

function ToolApprovalPrompt({approval, onRespond}: IToolApprovalPromptProps) {
    const {requestId, toolName, toolInput} = approval;
    const isBash: boolean = toolName === 'Bash';
    const filePath: string = isBash ? '' : ((toolInput.file_path as string) ?? 'unknown file');
    const bashCommand: string = isBash ? ((toolInput.command as string) ?? '') : '';

    const handleApprove = React.useCallback((): void => {
        onRespond(requestId, 'allow');
    }, [requestId, onRespond]);

    const handleDeny = React.useCallback((): void => {
        onRespond(requestId, 'deny', isBash ? 'User denied the command' : 'User denied the edit');
    }, [requestId, onRespond, isBash]);

    const handleAllowAll = React.useCallback((): void => {
        onRespond(requestId, 'allow', undefined, true);
    }, [requestId, onRespond]);

    return (
        <div className={'flex flex-col items-start w-full'}>
            <div className={'max-w-[85%] w-full rounded-2xl border border-warning/30 bg-warning/5 overflow-hidden'}>
                {/* Header */}
                <div className={'flex items-center gap-2 px-4 py-2.5 border-b border-warning/20 bg-warning/10'}>
                    <span className={'text-sm font-medium text-warning'}>
                        {isBash ? 'Run command?' : toolName === 'Write' ? 'Create file?' : 'Edit file?'}
                    </span>
                    {!isBash && (
                        <span className={'text-xs text-text-muted font-mono truncate flex-1'}>{filePath}</span>
                    )}
                </div>

                {/* Content */}
                <div className={'p-3'}>
                    {isBash ? (
                        <div className={'rounded-lg border border-primary/30 overflow-hidden bg-surface'}>
                            <pre className={'px-4 py-3 text-xs font-mono text-text overflow-x-auto'}>{bashCommand}</pre>
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
                    <Button variant={'danger'} size={'sm'} onClick={handleDeny} className={'gap-1.5'}>
                        <HiOutlineX className={'size-3.5'}/>
                        Deny
                    </Button>
                </div>
            </div>
        </div>
    );
}

export {ToolApprovalPrompt};
