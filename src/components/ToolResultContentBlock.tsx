"use client";

import React from "react";
import {HiOutlineChevronRight, HiOutlineTrash} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {stubToolResults} from "@/actions/message.actions";
import type {IToolResultContentBlockProps} from "@/types/components";

function ToolResultContentBlock({block, sessionId, messageId, onStubbed}: IToolResultContentBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [isStubbing, setIsStubbing] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const estimatedTokens: number = block._stubbed
        ? (block._originalTokenCount ?? 0)
        : Math.round(block.content.length / 4);

    const handleStub = React.useCallback(async (): Promise<void> => {
        setIsStubbing(true);
        setError(null);

        const result = await stubToolResults(sessionId, [messageId]);

        if (!result.success) {
            setError(result.error || 'Failed to remove content!');
            setIsStubbing(false);
            return;
        }

        setIsModalOpen(false);
        setIsStubbing(false);
        onStubbed(messageId);
    }, [sessionId, messageId, onStubbed]);

    if (block._stubbed) {
        return (
            <div className={'my-2 text-xs text-text-muted bg-surface border border-border rounded-md px-3 py-1.5 font-mono'}>
                {block.content}
            </div>
        );
    }

    return (
        <div className={'group/tool-result my-2 border border-border rounded-lg overflow-hidden'}>
            <div className={'flex items-center'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex items-center gap-2 flex-1 justify-start text-xs text-text-muted active:bg-transparent active:scale-100'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                    <span className={'font-mono'}>tool_result</span>
                    <span className={'text-text-muted/60'}>-{estimatedTokens.toLocaleString()} tokens</span>
                </Button>
                <Button variant={'ghost'} size={'icon'} onClick={() => setIsModalOpen(true)} title={'Remove content'}
                        className={'size-7 opacity-0 group-hover/tool-result:opacity-100 text-text-muted hover:text-warning shrink-0 mr-1'}>
                    <HiOutlineTrash className={'size-3.5'}/>
                </Button>
            </div>

            {isOpen && (
                <div className={'px-3 pb-3 text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed bg-code-bg max-h-64 overflow-y-auto'}>
                    {block.content}
                </div>
            )}

            <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
                <div className={'p-6'}>
                    <h2 className={'text-base font-semibold text-text'}>{'Remove tool result content?'}</h2>
                    <p className={'text-sm text-text-muted mt-2'}>
                        This frees ~`{estimatedTokens.toLocaleString()}` tokens. The tool call will be kept
                    </p>

                    {error && (
                        <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{error}</p>
                    )}

                    <div className={'flex items-center justify-end gap-2 mt-5'}>
                        <Button variant={'ghost'} size={'sm'} onClick={() => setIsModalOpen(false)} disabled={isStubbing}>
                            Cancel
                        </Button>
                        <Button variant={'danger'} size={'sm'} onClick={handleStub} isLoading={isStubbing}>
                            Remove
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export {ToolResultContentBlock};
