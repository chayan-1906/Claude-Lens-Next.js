"use client";

import React from "react";
import {HiOutlineChevronRight} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import {stubToolResults} from "@/actions/message.actions";
import type {IThinkingBlockProps} from "@/types/components";

function ThinkingBlock({block, sessionId, messageId, onStubbed}: IThinkingBlockProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
    const [isStubbing, setIsStubbing] = React.useState<boolean>(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleStub = React.useCallback(async (): Promise<void> => {
        if (!sessionId || !messageId || !onStubbed) return;
        setIsStubbing(true);
        setError(null);

        const result = await stubToolResults(sessionId, [messageId]);

        if (!result.success) {
            setError(result.error || 'Failed to remove thinking content!');
            setIsStubbing(false);
            return;
        }

        setIsModalOpen(false);
        setIsStubbing(false);
        onStubbed(messageId);
    }, [sessionId, messageId, onStubbed]);

    if (!block.thinking || block.thinking.trim() === '') {
        return null;
    }

    const estimatedTokens: number = block._stubbed
        ? (block._originalTokenCount ?? 0)
        : Math.round(block.thinking.length / 4);

    const canStub: boolean = !block._stubbed && !!sessionId && !!messageId && !!onStubbed;

    if (block._stubbed) {
        return (
            <div className={'text-xs text-text-muted bg-surface border border-primary/30 rounded-md p-3 font-mono'}>
                {block.thinking}
            </div>
        );
    }

    return (
        <div className={'group/thinking border border-primary/30 rounded-lg overflow-hidden'}>
            <div className={'flex items-center'}>
                <Button variant={'ghost'} size={'sm'} onClick={() => setIsOpen((prev: boolean) => !prev)}
                        className={'flex items-center gap-2 flex-1 justify-start p-3 text-xs text-text-muted hover:bg-transparent active:bg-transparent active:scale-100'}>
                    <HiOutlineChevronRight className={cn('size-3 transition-transform', isOpen && 'rotate-90')}/>
                    <span>Thinking...</span>
                    <span className={'text-text-muted/60'}>~{estimatedTokens.toLocaleString()} tokens</span>
                </Button>
                {/*{canStub && (
                    <Button variant={'ghost'} size={'icon'} onClick={() => setIsModalOpen(true)} title={'Remove thinking content'}
                            className={'size-7 opacity-0 group-hover/thinking:opacity-100 text-text-muted hover:text-warning shrink-0 mr-1'}>
                        <HiOutlineTrash className={'size-3.5'}/>
                    </Button>
                )}*/}
            </div>

            {isOpen && (
                <div className={'px-3 py-3 text-xs text-text-muted whitespace-pre-wrap font-mono leading-relaxed'}>
                    {block.thinking}
                </div>
            )}

            <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
                <div className={'p-6'}>
                    <h2 className={'text-base font-semibold text-text'}>Remove thinking content?</h2>
                    <p className={'text-sm text-text-muted mt-2'}>
                        This frees ~{estimatedTokens.toLocaleString()} tokens. The thinking block will be kept as a stub!
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

export {ThinkingBlock};
