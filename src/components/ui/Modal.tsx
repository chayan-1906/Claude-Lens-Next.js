"use client";

import React from "react";
import {createPortal} from "react-dom";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IModalProps} from "@/types/components";

// Empty subscription for useSyncExternalStore (never updates)
const subscribe = () => () => {
}

function Modal({isOpen, onOpenChange, onClose, children, className}: IModalProps) {
    const mounted: boolean = React.useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );

    const [showOpen, setShowOpen] = React.useState<boolean>(false);

    const handleClose = React.useCallback((): void => {
        onOpenChange(false);
        onClose?.();
    }, [onOpenChange, onClose]);

    const handleBackdropClick = React.useCallback((e: React.MouseEvent): void => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    }, [handleClose]);

    React.useLayoutEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            const rafId: number = requestAnimationFrame(() => {
                setShowOpen(true);
            });
            return () => {
                cancelAnimationFrame(rafId);
                document.body.style.overflow = '';
            };
        } else {
            document.body.style.overflow = '';
            const rafId: number = requestAnimationFrame(() => {
                setShowOpen(false);
            });
            return () => cancelAnimationFrame(rafId);
        }
    }, [isOpen]);

    React.useEffect(() => {
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    React.useEffect(() => {
        if (isOpen) {
            const handleKeyDown = (e: KeyboardEvent): void => {
                if (e.key === 'Escape') {
                    handleClose();
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleClose]);

    if (!mounted || !isOpen) {
        return null;
    }

    return createPortal(
        <div className={cn('fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity duration-200')} onClick={handleBackdropClick} role={'dialog'} aria-modal={'true'}>
            <div
                className={cn(
                    'relative w-full max-w-md rounded-lg',
                    'bg-surface border border-border',
                    'shadow-lg transition-all duration-200',
                    'max-h-[90vh] overflow-y-auto',
                    showOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
                    className,
                )}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Close button */}
                <Button variant={'ghost'} size={'sm'} onClick={handleClose} className={'absolute top-4 right-4 z-10 p-2 rounded-full'} aria-label={'Close modal'}>
                    <svg xmlns={'http://www.w3.org/2000/svg'} width={16} height={16} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={2} strokeLinecap={'round'}
                         strokeLinejoin={'round'}>
                        <line x1={18} y1={6} x2={6} y2={18}/>
                        <line x1={6} y1={6} x2={18} y2={18}/>
                    </svg>
                </Button>
                {children}
            </div>
        </div>,
        document.body,
    );
}

export {Modal};
