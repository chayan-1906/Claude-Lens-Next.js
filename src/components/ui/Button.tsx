"use client";

import React from "react";
import {cn} from "@/utils/cn";
import type {ButtonVariant, ButtonSize, IButtonProps} from "@/types/components";

/** Style mappings for each button variant */
const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-background hover:bg-dark-primary active:scale-[0.98]',
    secondary: 'bg-secondary text-background hover:bg-dark-secondary active:scale-[0.98]',
    ghost: 'bg-transparent text-text hover:bg-surface active:bg-border active:scale-[0.98]',
    outline: 'bg-transparent border border-border text-text hover:bg-surface active:bg-border active:scale-[0.98]',
    danger: 'bg-error text-white hover:bg-error/90 active:bg-error/70 active:scale-[0.98]',
    link: 'bg-transparent text-primary hover:underline active:text-dark-primary',
};

/** Style mappings for each button size */
const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
    icon: 'size-10 p-0',
};

function Button({variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, children, className, disabled, ...props}: IButtonProps) {
    const isDisabled: boolean = disabled || isLoading;

    const baseStyles: string = 'inline-flex items-center justify-center gap-2 rounded-md font-medium cursor-pointer select-none transform-gpu transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100';

    const content: React.ReactElement = isLoading ? (
        <div className={'flex justify-center gap-2'}>
            <LoadingSpinner />
            <span>{children}</span>
        </div>
    ) : (
        <>
            {leftIcon && <span className={'shrink-0'}>{leftIcon}</span>}
            {children}
            {rightIcon && <span className={'shrink-0'}>{rightIcon}</span>}
        </>
    );

    return (
        <button className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)} disabled={isDisabled} {...props}>
            {content}
        </button>
    );
}

function LoadingSpinner() {
    return (
        <svg className={'size-4 animate-spin'} viewBox={'0 0 24 24'} fill={'none'}>
            <circle className={'opacity-25'} cx={'12'} cy={'12'} r={'10'} stroke={'currentColor'} strokeWidth={'4'} />
            <path className={'opacity-75'} fill={'currentColor'} d={'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'} />
        </svg>
    );
}

export {Button};
