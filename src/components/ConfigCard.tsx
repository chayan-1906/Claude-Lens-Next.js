"use client";

import React from "react";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IConfigCardProps} from "@/types/components";

/** Truncate a MongoDB URI for display (hide credentials) */
function truncateUri(uri: string): string {
    return uri.length > 60 ? uri.substring(0, 57) + '...' : uri;
}

/** Format lastConnectedAt for display */
function formatLastConnected(isoDate?: string): string {
    if (!isoDate) return 'Never';
    const date: Date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'});
}

function ConfigCard({config, isActive, onEdit, onDelete, onActivate, onTest, isActivating}: IConfigCardProps) {
    return (
        <div className={cn(
            'relative rounded-lg border p-4 transition-all duration-200',
            isActive
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-surface hover:border-primary/40',
        )}>
            {/* Active badge */}
            {isActive && (
                <span className={'absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'}>
                    <span className={'inline-block size-1.5 rounded-full bg-success'}/>
                    Active
                </span>
            )}

            {/* Header: color dot + name */}
            <div className={'flex items-center gap-2.5 mb-2'}>
                <span className={'inline-block size-3 shrink-0 rounded-full border border-border'} style={{backgroundColor: config.color}}/>
                <h3 className={'text-sm font-semibold text-text truncate'}>{config.name}</h3>
            </div>

            {/* URI preview */}
            <p className={'text-xs text-text-muted font-mono truncate mb-1'}>{truncateUri(config.uri)}</p>

            {/* Description */}
            {config.description && (
                <p className={'text-xs text-text-muted truncate mb-1'}>{config.description}</p>
            )}

            {/* Last connected */}
            <p className={'text-xs text-text-muted mb-3'}>
                Last connected: {formatLastConnected(config.lastConnectedAt)}
            </p>

            {/* Actions */}
            <div className={'flex items-center gap-2 flex-wrap'}>
                {!isActive && (
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
