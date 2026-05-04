"use client";

import React from "react";
import {HiOutlineChevronRight, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineTrash} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {stubToolResults} from "@/actions/message.actions";
import {normalizeToolResultContent} from "@/utils/extractMessageText";
import type {IStubModalProps, IToolResultContentBlockProps} from "@/types/components";

function StubModal({isOpen, onOpenChange, estimatedTokens, error, isStubbing, onStub}: IStubModalProps): React.ReactElement {
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
            <div className={'p-6'}>
                <h2 className={'text-base font-semibold text-text'}>{'Remove tool result content?'}</h2>
                <p className={'text-sm text-text-muted mt-2'}>
                    This frees ~{estimatedTokens.toLocaleString()} tokens. The tool call will be kept!
                </p>
                {error && (
                    <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                )}
                <div className={'flex items-center justify-end gap-2 mt-5'}>
                    <Button variant={'ghost'} size={'sm'} onClick={() => onOpenChange(false)} disabled={isStubbing}>
                        Cancel
                    </Button>
                    <Button variant={'danger'} size={'sm'} onClick={onStub} isLoading={isStubbing}>
                        Remove
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

const ToolResultContentBlock = React.memo(function ToolResultContentBlock({block, toolUse, sessionId, messageId, onStubbed}: IToolResultContentBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(true);
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [isStubbing, setIsStubbing] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const contentText: string = normalizeToolResultContent(block.content);
    const estimatedTokens: number = block._stubbed
        ? (block._originalTokenCount ?? 0)
        : Math.round(contentText.length / 4);
    const canStub: boolean = !block._stubbed && !!sessionId && !!messageId && !!onStubbed;

    const handleStub = React.useCallback(async (): Promise<void> => {
        if (!sessionId || !messageId || !onStubbed) {
            return;
        }
        setIsStubbing(true);
        setError(null);
        const {success, error} = await stubToolResults(sessionId, [messageId]);
        if (!success) {
            setError(error || 'Failed to remove content!');
            setIsStubbing(false);
            return;
        }
        setIsModalOpen(false);
        setIsStubbing(false);
        onStubbed(messageId);
    }, [sessionId, messageId, onStubbed]);

    if (block._stubbed) {
        return (
            <div className={'text-xs text-text-muted bg-surface border border-primary/30 rounded-md p-3 font-mono'}>
                {contentText}
            </div>
        );
    }

    const toolName: string | undefined = toolUse?.name;

    // Edit / Write — success or error pill
    if (toolName === 'Edit' || toolName === 'Write') {
        const label: string = toolName === 'Edit' ? 'File edited' : 'File created';

        if (block.is_error) {
            return (
                <div className={'group/tool-result flex items-center gap-2 px-3 py-2 rounded-lg border border-error/30 bg-error/5'}>
                    <HiOutlineXCircle className={'size-3.5 text-error shrink-0'}/>
                    <span className={'text-xs text-error font-mono break-words min-w-0'}>{contentText || 'Error'}</span>
                    {canStub && (
                        <Button variant={'ghost'} size={'icon'} onClick={() => setIsModalOpen(true)} className={'size-6 opacity-0 group-hover/tool-result:opacity-100 text-text-muted hover:text-warning shrink-0'}>
                            <HiOutlineTrash className={'size-3'}/>
                        </Button>
                    )}
                    <StubModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} estimatedTokens={estimatedTokens} error={error} isStubbing={isStubbing} onStub={handleStub}/>
                </div>
            );
        }

        return (
            <div className={'flex items-center gap-2 px-3 py-2 rounded-lg border border-success/30 bg-success/5'}>
                <HiOutlineCheckCircle className={'size-3.5 text-success shrink-0'}/>
                <span className={'text-xs text-success font-mono'}>{label}</span>
            </div>
        );
    }

    // Read — scrollable formatted code view
    if (toolName === 'Read') {
        return (
            <div className={'group/tool-result border border-primary/30 rounded-lg overflow-hidden'}>
                <div className={'flex items-center px-3 py-2 bg-background border-b border-border'}>
                    <span className={'text-xs font-mono text-text-muted flex-1'}>file content</span>
                    <span className={'text-[10px] text-text-muted/60 mr-1'}>-{estimatedTokens.toLocaleString()} tokens</span>
                    {canStub && (
                        <Button variant={'ghost'} size={'icon'} onClick={() => setIsModalOpen(true)} className={'size-6 opacity-0 group-hover/tool-result:opacity-100 text-text-muted hover:text-warning shrink-0'}>
                            <HiOutlineTrash className={'size-3'}/>
                        </Button>
                    )}
                </div>
                <div className={'overflow-y-auto max-h-72 bg-code-bg'}>
                    <pre className={'text-xs font-mono text-text-muted p-3 whitespace-pre-wrap leading-5'}>
                        {contentText}
                    </pre>
                </div>
                <StubModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} estimatedTokens={estimatedTokens} error={error} isStubbing={isStubbing} onStub={handleStub}/>
            </div>
        );
    }

    // All others — existing behaviour
    return (
        <div className={'group/tool-result border border-primary/30 rounded-lg overflow-hidden'}>
            <div className={'flex items-center'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex items-center gap-2 flex-1 justify-start text-xs text-text-muted hover:bg-transparent active:bg-transparent active:scale-100'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                    <span className={'font-mono'}>tool_result</span>
                    <span className={'text-text-muted/60'}>-{estimatedTokens.toLocaleString()} tokens</span>
                </Button>
                {canStub && (
                    <Button variant={'ghost'} size={'icon'} onClick={() => setIsModalOpen(true)} title={'Remove tool_result content'}
                            className={'size-7 opacity-0 group-hover/tool-result:opacity-100 text-text-muted hover:text-warning shrink-0 mr-1'}>
                        <HiOutlineTrash className={'size-3.5'}/>
                    </Button>
                )}
            </div>

            {isOpen && (
                <div className={'px-3 py-3 text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed bg-code-bg max-h-64 overflow-y-auto'}>
                    {contentText}
                </div>
            )}
            <StubModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} estimatedTokens={estimatedTokens} error={error} isStubbing={isStubbing} onStub={handleStub}/>
        </div>
    );
});

export {ToolResultContentBlock};