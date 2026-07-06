"use client";

import React from "react";
import {Button} from "@/components/ui/Button";
import type {IPathMappingCardProps} from "@/types/components";

function PathMappingCard({mapping, onEdit, onDelete, onMerge, isMerging}: IPathMappingCardProps) {
    return (
        <div className={'rounded-lg border border-border bg-surface p-4 transition-all duration-200 hover:border-primary/40'}>
            {/* Header: label */}
            <h3 className={'text-sm font-semibold text-text mb-2'}>{mapping.label}</h3>

            {/* Paths list */}
            <ul className={'space-y-1 mb-3'}>
                {mapping.paths.map((path: string) => (
                    <li key={path} className={'flex items-center gap-2 text-xs font-mono truncate'}>
                        {path === mapping.canonicalPath
                            ? (
                                <>
                                    <span className={'inline-block size-1.5 shrink-0 rounded-full bg-success'}/>
                                    <span className={'text-primary'}>{path}</span>
                                    <span className={'text-[10px] text-success font-sans font-medium'}>canonical</span>
                                </>
                            )
                            : (
                                <>
                                    <span className={'inline-block size-1.5 shrink-0 rounded-full bg-border'}/>
                                    <span className={'text-text-muted'}>{path}</span>
                                </>
                            )
                        }
                    </li>
                ))}
            </ul>

            {/* Actions */}
            <div className={'flex items-center gap-2 flex-wrap'}>
                <Button variant={'outline'} size={'sm'} onClick={() => onMerge(mapping)} isLoading={isMerging} disabled={isMerging}>
                    Merge Existing Data
                </Button>
                <Button variant={'ghost'} size={'sm'} onClick={() => onEdit(mapping)}>
                    Edit
                </Button>
                <Button variant={'ghost'} size={'sm'} onClick={() => onDelete(mapping)} className={'text-error hover:text-error hover:bg-error/10'}>
                    Delete
                </Button>
            </div>
        </div>
    );
}

export {PathMappingCard};
