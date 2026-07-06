"use client";

import React from "react";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import type {IConfigCardProps} from "@/types/components";

const MONGO_URI_REGEX: RegExp = /^(mongodb(?:\+srv)?):\/\/[^@]+@([^/?]+)\/([^?]*)/;

function parseMongoUri(uri: string): string {
    const match: RegExpMatchArray | null = uri.match(MONGO_URI_REGEX);
    if (match) {
        const [, scheme, host, db] = match;
        return db ? `${scheme} • ${host} / ${db}` : `${scheme} • ${host}`;
    }
    return uri.length > 60 ? uri.slice(0, 57) + '...' : uri;
}

function formatLastConnected(isoDate?: string): string {
    if (!isoDate) {
        return 'Never';
    }
    const date: Date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'});
}

function ConfigCard({config, isActive, onEdit, onDelete, onActivate, onTest, isActivating}: IConfigCardProps) {
    const {name, description, uri, color, lastConnectedAt} = config;
    const [copied, setCopied] = React.useState<boolean>(false);

    function handleCopy(): void {
        navigator.clipboard.writeText(uri).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    }

    const parsedUri: string = parseMongoUri(uri);
    const isDescriptionUrl: boolean = typeof description === 'string' && description.startsWith('http');

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

            {/* URI row: parsed summary + copy button */}
            <div className={'flex items-center gap-1.5 mb-1'}>
                <p className={'text-xs text-text-muted font-mono truncate flex-1'}>{parsedUri}</p>
                <button
                    onClick={handleCopy}
                    title={'Copy URI'}
                    className={'shrink-0 rounded p-0.5 text-text-muted transition-colors hover:text-text'}>
                    {copied
                        ? (
                            <svg xmlns={'http://www.w3.org/2000/svg'} width={'12'} height={'12'} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={'2.5'} strokeLinecap={'round'} strokeLinejoin={'round'}>
                                <polyline points={'20 6 9 17 4 12'}/>
                            </svg>
                        )
                        : (
                            <svg xmlns={'http://www.w3.org/2000/svg'} width={'12'} height={'12'} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={'2'} strokeLinecap={'round'} strokeLinejoin={'round'}>
                                <rect x={'9'} y={'9'} width={'13'} height={'13'} rx={'2'} ry={'2'}/>
                                <path d={'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'}/>
                            </svg>
                        )
                    }
                </button>
            </div>

            {/* Description: Atlas link if URL, otherwise truncated text */}
            {description && (
                isDescriptionUrl
                    ? (
                        <a href={description} target={'_blank'} rel={'noreferrer'} className={'block text-xs text-primary hover:underline mb-1'}>
                            View in Atlas →
                        </a>
                    )
                    : (
                        <p className={'text-xs text-text-muted truncate mb-1'}>{description}</p>
                    )
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
