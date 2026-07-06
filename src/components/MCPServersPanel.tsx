"use client";

import React from "react";
import {HiOutlineChevronDown, HiOutlineChevronRight, HiOutlineChevronUp, HiOutlineLightningBolt, HiOutlineRefresh} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import {getMcpServers} from "@/actions/mcp.actions";
import {IMcpServersPanelProps} from "@/types/components";
import {EMcpStatus, IMcpServer, IMcpServerConfig} from "@/types/mcp";
import {buildToolsMap, deriveStatus, findToolsForServer, normalizeServerName} from "@/utils/mcpUtils";

const STATUS_CONFIG: Record<EMcpStatus, { label: string; icon: string; rowClass: string; badgeClass: string; dotClass: string }> = {
    [EMcpStatus.CONNECTED]: {
        label: 'Connected',
        icon: '✓',
        rowClass: 'border-success/25 bg-success/5',
        badgeClass: 'bg-success/15 text-success border border-success/40',
        dotClass: 'bg-success',
    },
    [EMcpStatus.NEEDS_AUTH]: {
        label: 'Needs Auth',
        icon: '△',
        rowClass: 'border-warning/25 bg-warning/5',
        badgeClass: 'bg-warning/15 text-warning border border-warning/40',
        dotClass: 'bg-warning',
    },
    [EMcpStatus.FAILED]: {
        label: 'Failed',
        icon: '✗',
        rowClass: 'border-error/25 bg-error/5',
        badgeClass: 'bg-error/15 text-error border border-error/40',
        dotClass: 'bg-error',
    },
    [EMcpStatus.DISABLED]: {
        label: 'Disabled',
        icon: '○',
        rowClass: 'border-border bg-border/10 opacity-55',
        badgeClass: 'bg-border/80 text-text-muted border border-border',
        dotClass: 'bg-text-muted/50',
    },
    [EMcpStatus.UNKNOWN]: {
        label: 'Not Connected',
        icon: '–',
        rowClass: 'border-border bg-surface',
        badgeClass: 'bg-border/50 text-text-muted border border-border/50',
        dotClass: 'bg-text-muted/40',
    },
};

function StatusBadge({status}: { status: EMcpStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0', cfg.badgeClass)}>
            <span>{cfg.icon}</span>
            {cfg.label}
        </span>
    );
}

function ServerRow({server}: { server: IMcpServer }) {
    const [expanded, setExpanded] = React.useState<boolean>(false);
    const cfg = STATUS_CONFIG[server.status];
    const hasTools = server.tools.length > 0;

    return (
        <div className={cn('rounded-xl border transition-all duration-150', cfg.rowClass)}>
            <div className={'flex items-center gap-2 px-3 py-2.5'}>
                <span className={cn('size-2 rounded-full shrink-0 ring-2 ring-offset-1', cfg.dotClass,
                    server.status === EMcpStatus.CONNECTED && 'ring-success/20 ring-offset-success/5',
                    server.status !== EMcpStatus.CONNECTED && 'ring-transparent ring-offset-transparent',
                )}/>

                <span className={'flex-1 text-xs font-semibold font-mono text-text truncate min-w-0'} title={server.name}>
                    {server.name}
                </span>

                {hasTools && (
                    <span className={'text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-text-muted shrink-0'}>
                        {server.tools.length}
                    </span>
                )}

                <StatusBadge status={server.status}/>

                {hasTools && (
                    <Button variant={'ghost'} size={'icon'} onClick={() => setExpanded((p: boolean) => !p)} className={'size-5 shrink-0 text-text-muted hover:text-text p-0'}>
                        {expanded
                            ? <HiOutlineChevronUp className={'size-3'}/>
                            : <HiOutlineChevronDown className={'size-3'}/>
                        }
                    </Button>
                )}
            </div>

            {(expanded && hasTools) && (
                <div className={'border-t border-border/40 px-3 py-2.5'}>
                    <p className={'text-[9px] font-bold uppercase tracking-widest text-text-muted mb-2'}>Tools</p>
                    <div className={'max-h-44 overflow-y-auto flex flex-col gap-0.5 pr-0.5 custom-scrollbar'}>
                        {server.tools.map((tool: string) => (
                            <div key={tool} className={'flex items-center gap-2 py-0.5'}>
                                <span className={'size-1 rounded-full bg-primary/30 shrink-0'}/>
                                <span className={'text-[10px] font-mono text-text-muted truncate'}>{tool}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MCPServersPanel({contextInfo}: IMcpServersPanelProps) {
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const [configServers, setConfigServers] = React.useState<IMcpServerConfig[]>([]);
    const [isLoadingConfig, setIsLoadingConfig] = React.useState<boolean>(true);

    const loadConfig = React.useCallback((): void => {
        setIsLoadingConfig(true);
        getMcpServers().then(({servers}: { servers?: IMcpServerConfig[] }) => {
            setConfigServers(servers ?? []);
            setIsLoadingConfig(false);
        });
    }, []);

    React.useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    const liveStatusMap = React.useMemo<Record<string, string>>(() => {
        const map: Record<string, string> = {};
        for (const s of contextInfo?.mcpServers ?? []) {
            map[s.name] = s.status;
            map[normalizeServerName(s.name)] = s.status;
        }
        return map;
    }, [contextInfo?.mcpServers]);

    const toolsMap = React.useMemo<Record<string, string[]>>(() => {
        return buildToolsMap(contextInfo?.tools ?? []);
    }, [contextInfo?.tools]);

    const mergedServers = React.useMemo<IMcpServer[]>(() => {
        const configNames = new Set<string>(configServers.map((s: IMcpServerConfig) => s.name));

        const fromConfig: IMcpServer[] = configServers.map((s: IMcpServerConfig) => ({
            ...s,
            status: deriveStatus(
                liveStatusMap[s.name] ?? liveStatusMap[normalizeServerName(s.name)],
                s.disabled,
            ),
            tools: findToolsForServer(s.name, toolsMap),
        }));

        const extra: IMcpServer[] = (contextInfo?.mcpServers ?? [])
            .filter((ls: { name: string; status: string }) => !configNames.has(ls.name))
            .map((ls: { name: string; status: string }) => ({
                name: ls.name,
                group: 'user' as const,
                type: 'builtin',
                disabled: false,
                status: deriveStatus(ls.status, false),
                tools: findToolsForServer(ls.name, toolsMap),
            }));

        return [...fromConfig, ...extra];
    }, [configServers, liveStatusMap, toolsMap, contextInfo?.mcpServers]);

    const connectedCount = mergedServers.filter((server: IMcpServer) => server.status === EMcpStatus.CONNECTED).length;
    const totalCount = mergedServers.length;
    const sessionActive = contextInfo !== null;

    return (
        <div className={cn('flex h-full shrink-0 transition-all duration-300 ease-in-out', isOpen ? 'w-72' : 'w-9')}>

            {/* Collapsed vertical tab */}
            {!isOpen && (
                <Button
                    variant={'ghost'} onClick={() => setIsOpen(true)}
                    className={'flex flex-col items-center justify-start gap-3 w-full h-full py-5 border-l border-border bg-surface hover:bg-primary/5 rounded-none cursor-pointer select-none active:bg-transparent active:scale-100'}
                    title={'Open MCP Servers panel'}>
                    <HiOutlineLightningBolt className={'size-4 text-accent shrink-0'}/>
                    <span className={'text-[10px] font-bold text-text-muted tracking-widest uppercase shrink-0'} style={{writingMode: 'vertical-lr', transform: 'rotate(180deg)'}}>
                        MCP
                    </span>
                    {totalCount > 0 && (
                        <span className={cn('size-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0 ring-1',
                            sessionActive && connectedCount > 0 ? 'bg-success/20 text-success ring-success/30' : 'bg-border text-text-muted ring-border',
                        )}>
                            {sessionActive ? connectedCount : totalCount}
                        </span>
                    )}
                </Button>
            )}

            {/* Expanded panel */}
            {isOpen && (
                <div className={'flex flex-col w-full h-full border-l border-border bg-surface overflow-hidden'}>

                    {/* Header */}
                    <div className={'flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0 bg-linear-to-br from-accent/10 via-surface to-surface'}>
                        <div className={'flex items-center gap-2 min-w-0'}>
                            <div className={'size-6 rounded-lg bg-accent/15 flex items-center justify-center shrink-0'}>
                                <HiOutlineLightningBolt className={'size-3.5 text-accent'}/>
                            </div>
                            <div className={'flex flex-col min-w-0'}>
                                <span className={'text-xs font-bold text-text leading-tight'}>MCP Servers</span>
                                <span className={'text-[10px] text-text-muted leading-tight'}>
                                    {sessionActive ? `${connectedCount} of ${totalCount} connected` : `${totalCount} configured`}
                                </span>
                            </div>
                        </div>
                        <div className={'flex items-center gap-1 shrink-0'}>
                            <Button variant={'ghost'} size={'icon'} onClick={loadConfig} className={'size-6 text-text-muted hover:text-text'} title={'Refresh'}>
                                <HiOutlineRefresh className={cn('size-3.5', isLoadingConfig && 'animate-spin')}/>
                            </Button>
                            <Button variant={'ghost'} size={'icon'} onClick={() => setIsOpen(false)} className={'size-6 text-text-muted hover:text-text'} title={'Close'}>
                                <HiOutlineChevronRight className={'size-3.5'}/>
                            </Button>
                        </div>
                    </div>

                    {/* Status summary strip */}
                    <div className={'px-3 py-2 border-b border-border/50 bg-background/50 shrink-0'}>
                        {sessionActive ? (
                            <div className={'flex flex-wrap gap-1.5'}>
                                {([EMcpStatus.CONNECTED, EMcpStatus.NEEDS_AUTH, EMcpStatus.FAILED, EMcpStatus.DISABLED] as EMcpStatus[]).map((s: EMcpStatus) => {
                                    const count = mergedServers.filter((srv: IMcpServer) => srv.status === s).length;
                                    if (count === 0) return null;
                                    const cfg = STATUS_CONFIG[s];
                                    return (
                                        <span key={s} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', cfg.badgeClass)}>
                                            <span>{cfg.icon}</span>
                                            <span>{cfg.label}</span>
                                            <span className={'font-bold'}>{count}</span>
                                        </span>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className={'text-[10px] text-text-muted italic'}>
                                Start a session to see live status
                            </p>
                        )}
                    </div>

                    {/* Server list */}
                    <div className={'flex-1 overflow-y-auto px-2.5 py-2.5 flex flex-col gap-1.5'}>
                        {isLoadingConfig ? (
                            <div className={'flex items-center justify-center py-10'}>
                                <HiOutlineRefresh className={'size-5 text-text-muted animate-spin'}/>
                            </div>
                        ) : mergedServers.length === 0 ? (
                            <div className={'flex flex-col items-center gap-3 py-10 text-center px-4'}>
                                <div className={'size-10 rounded-2xl bg-border/40 flex items-center justify-center'}>
                                    <HiOutlineLightningBolt className={'size-5 text-text-muted/50'}/>
                                </div>
                                <p className={'text-xs text-text-muted'}>No MCP servers configured!</p>
                            </div>
                        ) : (
                            <>
                                <p className={'text-[9px] font-bold uppercase tracking-widest text-text-muted px-1 mb-0.5'}>
                                    User MCPs — {totalCount} server{totalCount !== 1 ? 's' : ''}
                                </p>
                                {mergedServers.map((server: IMcpServer) => (
                                    <ServerRow key={server.name} server={server}/>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export {MCPServersPanel};
