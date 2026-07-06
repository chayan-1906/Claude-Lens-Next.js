"use client";

import React from "react";
import {createPortal} from "react-dom";
import {useRouter} from "next/navigation";
import {AppRouterInstance} from "next/dist/shared/lib/app-router-context.shared-runtime";
import {HiOutlineChatAlt2, HiOutlineClipboardList, HiOutlineDocumentText, HiOutlineFolder, HiOutlineSearch, HiOutlineX} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {routes} from "@/utils/routes";
import {useSearch} from "@/hooks/useSearch";
import {Button} from "@/components/ui/Button";
import type {IResultGroupProps, IResultPreviewProps, ISearchModalProps} from "@/types/components";
import {ISearchMemoryResponse, ISearchMessageResponse, ISearchSessionResponse, ISearchTaskResponse, TSearchItem, TSearchScope, VALID_SCOPES} from "@/types/search";

const SCOPE_LABELS: Record<TSearchScope, string> = {
    session: 'Session',
    project: 'Project',
    global: 'Global',
};

const subscribe = (): (() => void) => () => {
}

function SearchModal({isOpen, onClose, defaultScope, sessionId, projectDir}: ISearchModalProps) {
    const router: AppRouterInstance = useRouter();
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [scope, setScope] = React.useState<TSearchScope>(defaultScope);
    const [hoveredItem, setHoveredItem] = React.useState<TSearchItem | null>(null);

    const mounted: boolean = React.useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );

    const {query, setQuery, results, isLoading, reset} = useSearch(scope, sessionId, projectDir);

    const isChipDisabled = React.useCallback((scope: TSearchScope): boolean => {
        if (scope === 'session') return !sessionId;
        if (scope === 'project') return !projectDir;
        return false;
    }, [sessionId, projectDir]);

    const handleResultClick = React.useCallback((result: TSearchItem): void => {
        if (result._type === 'memory') {
            router.push(routes.memoryPath(result.projectDir));
        } else {
            router.push(routes.sessionPath(result.sessionId));
        }
        onClose();
    }, [router, onClose]);

    const totalCount: number = results
        ? (results.messages?.length ?? 0) + (results.sessions?.length ?? 0) + (results.tasks?.length ?? 0) + (results.memories?.length ?? 0)
        : 0;
    const hasResults: boolean = totalCount > 0;
    const hasQuery: boolean = query.trim().length >= 2;

    React.useEffect(() => {
        if (isOpen) {
            setScope(defaultScope);
            reset();
            setHoveredItem(null);
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [isOpen, defaultScope, reset]);

    React.useEffect(() => {
        const first = results?.messages?.[0] ?? results?.sessions?.[0] ?? results?.tasks?.[0] ?? results?.memories?.[0] ?? null;
        setHoveredItem(first);
    }, [results]);

    React.useLayoutEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    React.useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!mounted || !isOpen) {
        return null;
    }

    return createPortal(
        <div className={'fixed inset-0 flex items-start justify-center pt-[12vh] px-4 bg-black/60 backdrop-blur-sm z-60'} onClick={onClose}>
            <div className={cn('w-full bg-surface border border-border rounded-xl shadow-2xl overflow-hidden transition-[max-width] duration-200', hasResults ? 'max-w-4xl' : 'max-w-2xl')}
                 onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Input row */}
                <div className={'flex items-center gap-3 px-4 border-b border-border'}>
                    <HiOutlineSearch className={'size-4 text-text-muted shrink-0'}/>
                    <input
                        ref={inputRef}
                        type={'text'}
                        value={query}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                        placeholder={'Search messages, sessions, tasks, memories…'}
                        className={'flex-1 py-4 bg-transparent text-text placeholder-text-muted outline-none text-sm'}
                    />
                    <div className={'flex items-center gap-2 shrink-0'}>
                        {isLoading && (
                            <svg className={'size-4 animate-spin text-primary'} viewBox={'0 0 24 24'} fill={'none'}>
                                <circle className={'opacity-25'} cx={'12'} cy={'12'} r={'10'} stroke={'currentColor'} strokeWidth={'4'}/>
                                <path className={'opacity-75'} fill={'currentColor'}
                                      d={'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'}/>
                            </svg>
                        )}
                        <Button variant={'ghost'} size={'icon'} onClick={onClose} className={'size-7 text-text-muted'} aria-label={'Close search'}>
                            <HiOutlineX className={'size-4'}/>
                        </Button>
                    </div>
                </div>

                {/* Scope chips */}
                <div className={'flex items-center gap-2 px-4 py-2.5 border-b border-border bg-background/40'}>
                    <span className={'text-[10px] font-medium text-text-muted uppercase tracking-wider mr-1'}>Scope</span>
                    {VALID_SCOPES.map((validScope: TSearchScope) => {
                        const disabled: boolean = isChipDisabled(validScope);
                        return (
                            <Button key={validScope} variant={'ghost'} size={'sm'} disabled={disabled} onClick={() => setScope(validScope)}
                                    className={cn('px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 h-auto',
                                        scope === validScope ? 'bg-primary text-background shadow-sm hover:bg-dark-primary' : 'bg-border/60 text-text-muted hover:bg-border hover:text-text',
                                        disabled && 'opacity-30 cursor-not-allowed pointer-events-none',
                                    )}
                            >
                                {SCOPE_LABELS[validScope]}
                            </Button>
                        );
                    })}
                    {hasResults && (
                        <span className={'ml-auto text-[10px] text-text-muted'}>{totalCount} result{totalCount !== 1 ? 's' : ''}</span>
                    )}
                </div>

                {/* Body: single panel or two-panel layout */}
                <div className={'flex divide-x divide-border max-h-[50vh]'}>
                    {/* Left panel — results list */}
                    <div className={cn('overflow-y-auto', hasResults ? 'w-2/5 shrink-0' : 'w-full')}>
                        {!hasQuery && (
                            <div className={'flex flex-col items-center justify-center py-12 gap-2'}>
                                <HiOutlineSearch className={'size-8 text-text-muted/30'}/>
                                <p className={'text-sm text-text-muted'}>Type at least 2 characters to search</p>
                            </div>
                        )}

                        {hasQuery && isLoading && !hasResults && (
                            <div className={'flex items-center justify-center py-12'}>
                                <p className={'text-sm text-text-muted'}>Searching...</p>
                            </div>
                        )}

                        {(hasQuery && !isLoading && !hasResults) && (
                            <div className={'flex flex-col items-center justify-center py-12 gap-2'}>
                                <p className={'text-sm text-text-muted'}>No results for <span className={'font-medium text-text'}>&#34;{query.trim()}&#34;!</span></p>
                            </div>
                        )}

                        {(hasResults && results) && (
                            <>
                                <ResultGroup
                                    icon={<HiOutlineChatAlt2 className={'size-3.5'}/>}
                                    label={'Messages'}
                                    items={results.messages ?? []}
                                    onSelect={handleResultClick}
                                    onHover={(item: TSearchItem) => setHoveredItem(item)}
                                    activeItem={hoveredItem}
                                    renderMeta={(result: ISearchMessageResponse) => (
                                        <span
                                            className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide', result.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent')}>
                                            {result.role}
                                        </span>
                                    )}
                                    renderSub={(result: ISearchMessageResponse) => result.sessionTitle}
                                />
                                <ResultGroup
                                    icon={<HiOutlineFolder className={'size-3.5'}/>}
                                    label={'Sessions'}
                                    items={results.sessions ?? []}
                                    onSelect={handleResultClick}
                                    onHover={(item: TSearchItem) => setHoveredItem(item)}
                                    activeItem={hoveredItem}
                                    renderSub={(result: ISearchSessionResponse) => result.projectDir}
                                />
                                <ResultGroup
                                    icon={<HiOutlineClipboardList className={'size-3.5'}/>}
                                    label={'Tasks'}
                                    items={results.tasks ?? []}
                                    onSelect={handleResultClick}
                                    onHover={(item: TSearchItem) => setHoveredItem(item)}
                                    activeItem={hoveredItem}
                                    renderMeta={(result: ISearchTaskResponse) => (
                                        <span className={'text-[10px] text-text-muted capitalize'}>{result.status.replace('_', ' ')}</span>
                                    )}
                                    renderSub={(result: ISearchTaskResponse) => result.sessionTitle}
                                />
                                <ResultGroup
                                    icon={<HiOutlineDocumentText className={'size-3.5'}/>}
                                    label={'Memories'}
                                    items={results.memories ?? []}
                                    onSelect={handleResultClick}
                                    onHover={(item: TSearchItem) => setHoveredItem(item)}
                                    activeItem={hoveredItem}
                                    renderSub={(result: ISearchMemoryResponse) => result.filePath}
                                />
                            </>
                        )}
                    </div>

                    {/* Right panel — preview */}
                    {hasResults && (
                        <div className={'flex-1 overflow-y-auto'}>
                            <ResultPreview item={hoveredItem} query={query}/>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className={'flex items-center gap-3 px-4 py-2 border-t border-border bg-background/40'}>
                    <span className={'text-[10px] text-text-muted'}>
                        <kbd className={'px-1.5 py-0.5 rounded border border-border font-mono bg-surface'}>↵</kbd>
                        {' '}navigate
                    </span>
                    <span className={'text-[10px] text-text-muted'}>
                        <kbd className={'px-1.5 py-0.5 rounded border border-border font-mono bg-surface'}>ESC</kbd>
                        {' '}close
                    </span>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function ResultGroup<T extends TSearchItem>({icon, label, items, onSelect, onHover, activeItem, renderMeta, renderSub}: IResultGroupProps<T>) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div>
            <div className={'flex items-center gap-2 px-4 py-2 bg-surface border-b border-border/50 sticky top-0 z-10'}>
                <span className={'text-text-muted'}>{icon}</span>
                <span className={'text-[10px] font-semibold text-text-muted uppercase tracking-wider'}>{label}</span>
                <span className={'ml-auto text-[10px] text-text-muted/60'}>{items.length}</span>
            </div>
            {items.map((item: T, index: number) => (
                <Button key={index} variant={'ghost'} size={'sm'} onClick={() => onSelect(item)} onMouseEnter={() => onHover?.(item)}
                        className={cn('w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-primary/10 active:bg-primary/10 transition-colors border-b border-border last:border-b-0 h-auto rounded-none justify-start',
                            item === activeItem && 'bg-primary/10',
                        )}>
                    <div className={'flex-1 min-w-0'}>
                        {renderMeta && (
                            <div className={'flex items-center gap-2 mb-0.5'}>
                                {renderMeta(item)}
                            </div>
                        )}
                        <p className={'text-xs text-text leading-relaxed line-clamp-2'}>{item.snippet}</p>
                        {renderSub && (
                            <p className={'text-[10px] text-text-muted mt-0.5 truncate'}>{renderSub(item)}</p>
                        )}
                    </div>
                    <HiOutlineSearch className={'size-3 text-text-muted/40 shrink-0 mt-1'}/>
                </Button>
            ))}
        </div>
    );
}

const TYPE_ICON: Record<TSearchItem['_type'], React.ReactNode> = {
    message: <HiOutlineChatAlt2 className={'size-3.5'}/>,
    session: <HiOutlineFolder className={'size-3.5'}/>,
    task: <HiOutlineClipboardList className={'size-3.5'}/>,
    memory: <HiOutlineDocumentText className={'size-3.5'}/>,
};

function highlightText(text: string, query: string): React.ReactNode {
    if (!query.trim()) return text;
    const terms: string[] = query.trim().split(/\s+/).filter(Boolean);
    const escaped: string = terms.map((t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const parts: string[] = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
        <>
            {parts.map((part: string, i: number) =>
                i % 2 === 1
                    ? <mark key={i} className={'bg-primary/20 text-primary rounded-sm px-0.5 not-italic'}>{part}</mark>
                    : part
            )}
        </>
    );
}

function ResultPreview({item, query}: IResultPreviewProps) {
    if (!item) {
        return (
            <div className={'flex flex-col items-center justify-center min-h-50 h-full gap-2'}>
                <HiOutlineSearch className={'size-8 text-text-muted/20'}/>
                <p className={'text-xs text-text-muted'}>Hover a result to preview</p>
            </div>
        );
    }

    return (
        <div className={'flex flex-col gap-3 p-4'}>
            {/* Type label */}
            <div className={'flex items-center gap-1.5 text-text-muted/50'}>
                {TYPE_ICON[item._type]}
                <span className={'text-[9px] font-semibold uppercase tracking-wider'}>{item._type}</span>
            </div>

            {/* Header */}
            <div className={'flex flex-col gap-1'}>
                {item._type === 'message' && (
                    <>
                        <span className={cn('self-start px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wide',
                            item.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent')}>
                            {item.role}
                        </span>
                        <p className={'text-sm font-medium text-'}>{item.sessionTitle}</p>
                        <p className={'text-[10px] text-text-muted break-all'}>{item.projectDir}</p>
                    </>
                )}
                {item._type === 'session' && (
                    <>
                        <p className={'text-sm font-medium text-text test accent-amber-700'}>{item.title}</p>
                        <p className={'text-[10px] text-text-muted break-all'}>{item.projectDir}</p>
                    </>
                )}
                {item._type === 'task' && (
                    <>
                        <p className={'text-sm font-medium text-text'}>{item.subject}</p>
                        <div className={'flex items-start gap-1.5'}>
                            <span className={'text-[10px] text-text-muted capitalize shrink-0'}>{item.status.replace('_', ' ')}</span>
                            <span className={'text-text-muted/30 shrink-0'}>•</span>
                            <span className={'text-[10px] text-text-muted'}>{item.sessionTitle}</span>
                        </div>
                        <p className={'text-[10px] text-text-muted break-all text accent-green-400'}>{item.projectDir}</p>
                    </>
                )}
                {item._type === 'memory' && (
                    <>
                        <p className={'text-sm font-medium text-text break-all'}>{item.filePath}</p>
                        <p className={'text-[10px] text-text-muted break-all'}>{item.projectDir}</p>
                    </>
                )}
            </div>

            <div className={'border-t border-border/50'}/>

            {/* Snippet */}
            <p className={'text-xs text-text/80 leading-relaxed'}>{highlightText(item.snippet, query)}</p>
        </div>
    );
}

export {SearchModal};
