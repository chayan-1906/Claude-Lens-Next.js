"use client";

import React from "react";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IConfigCardProps} from "@/types/components";

/** Format lastConnectedAt for display */
function formatLastConnected(isoDate?: string): string {
    if (!isoDate) {
        return 'Never';
    }
    const date: Date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'});
}

function ConfigCard({config, isActive, onEdit, onDelete, onActivate, onTest, isActivating}: IConfigCardProps) {
    const {name, description, uri, color, lastConnectedAt} = config;

    return (
        <div
            className={cn('relative rounded-lg border p-4 transition-all duration-200', isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-surface hover:border-primary/40')}>
            {/* Active badge */}
            {isActive && (
                <span className={'absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'}>
                    <span className={'inline-block size-1.5 rounded-full bg-success'}/>
                    Active
                </span>
            )}

            {/* Header: color dot + name */}
            <div className={'flex items-center gap-2.5 mb-2'}>
                <span className={'inline-block size-3 shrink-0 rounded-full border border-border'} style={{backgroundColor: color}}/>
                <h3 className={'text-sm font-semibold text-text truncate'}>{name}</h3>
            </div>

            {/* URI preview */}
            <p className={'text-xs text-text-muted font-mono font-semibold mb-1'}>{uri}</p>

            {/* Description */}
            {description && (
                <p className={'text-xs text-text-muted mb-1 break-all'}>{description}</p>
            )}

            {/* Last connected */}
            <p className={'text-xs text-text-muted mb-3'}>
                Last connected: {formatLastConnected(lastConnectedAt)}
            </p>

            {/* Actions */}
            <div className={'flex items-center gap-2 flex-wrap'}>
                {isActive ? (
                    <Button variant={'outline'} size={'sm'} onClick={() => onActivate(config)} isLoading={isActivating} disabled={isActivating}>
                        Reconnect
                    </Button>
                ) : (
                    <Button variant={'primary'} size={'sm'} onClick={() => onActivate(config)} isLoading={isActivating} disabled={isActivating}>
                        Connect
                    </Button>
                )}
                <Button variant={'outline'} size={'sm'} onClick={() => onTest(config)}>
                    Test
                </Button>
                <Button variant={'ghost'} size={'sm'} onClick={() => onEdit(config)}>
                    Edit
                </Button>
                {!isActive && (
                    <Button variant={'ghost'} size={'sm'} onClick={() => onDelete(config)} className={'text-error hover:text-error hover:bg-error/10'}>
                        Delete
                    </Button>
                )}
            </div>
        </div>
    );
}

export {ConfigCard};
