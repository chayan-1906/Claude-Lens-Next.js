"use client";

import React from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {HiOutlineChevronRight, HiOutlineDocumentText, HiOutlineFolder} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {routes} from "@/utils/routes";
import type {IMemory} from "@/types/memory";
import {Button} from "@/components/ui/Button";
import type {ISession} from "@/types/session";
import {getAllMemories} from "@/actions/memory.actions";
import {getAllSessions} from "@/actions/sessionss.actions";
import type {ISidebarClientProps} from "@/types/components";

function SidebarClient({projects}: ISidebarClientProps) {
    const pathname: string = usePathname();
    const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(new Set());
    const [sessionsMap, setSessionsMap] = React.useState<Record<string, ISession[]>>({});
    const [memoriesMap, setMemoriesMap] = React.useState<Record<string, IMemory[]>>({});
    const [loadingProject, setLoadingProject] = React.useState<string | null>(null);

    const handleToggleProject = React.useCallback(async (projectDir: string): Promise<void> => {
        setExpandedProjects((prev: Set<string>) => {
            const next: Set<string> = new Set(prev);
            if (next.has(projectDir)) {
                next.delete(projectDir);
            } else {
                next.add(projectDir);
            }
            return next;
        });

        if (sessionsMap[projectDir] && memoriesMap[projectDir]) return;

        setLoadingProject(projectDir);
        const [sessionsResult, memoriesResult] = await Promise.all([
            getAllSessions({projectDir, limit: 50}),
            getAllMemories({projectDir, limit: 50}),
        ]);
        setLoadingProject(null);

        if (sessionsResult.success && sessionsResult.sessions && sessionsResult.sessions.length !== 0) {
            setSessionsMap((prev) => ({...prev, [projectDir]: sessionsResult.sessions!}));
        }
        if (memoriesResult.success && memoriesResult.memories && memoriesResult.memories.length !== 0) {
            setMemoriesMap((prev) => ({...prev, [projectDir]: memoriesResult.memories!}));
        }
    }, [sessionsMap, memoriesMap]);

    if (projects.length === 0) {
        return (
            <p className={'text-xs text-text-muted text-center py-4'}>{'No projects yet'}</p>
        );
    }

    return (
        <nav className={'flex flex-col gap-0.5'}>
            {projects.map((projectDir: string) => {
                const projectName: string = projectDir.split('/').filter(Boolean).pop() || projectDir;
                const isExpanded: boolean = expandedProjects.has(projectDir);
                const sessions: ISession[] = sessionsMap[projectDir] ?? [];
                const memories: IMemory[] = memoriesMap[projectDir] ?? [];
                const isLoading: boolean = loadingProject === projectDir;

                return (
                    <div key={projectDir}>
                        {/* Project header */}
                        <Button variant={'ghost'} size={'sm'} onClick={() => handleToggleProject(projectDir)} className={'flex items-center justify-start gap-2 w-full px-3 py-2 text-sm text-text'}>
                            <HiOutlineChevronRight className={cn('size-3 shrink-0 transition-transform', isExpanded && 'rotate-90')}/>
                            <HiOutlineFolder className={'size-4 shrink-0 text-text-muted'}/>
                            <span className={'truncate font-medium'} title={projectDir}>{projectName}</span>
                        </Button>

                        {/* Sessions & memories list */}
                        {isExpanded && (
                            <div className={'ml-5 flex flex-col gap-0.5 mt-0.5'}>
                                {isLoading && (
                                    <p className={'text-xs text-text-muted px-3 py-1.5'}>{'Loading...'}</p>
                                )}
                                {(!isLoading && sessions.length === 0 && memories.length === 0) && (
                                    <p className={'text-xs text-text-muted px-3 py-1.5'}>{'No sessions & memories'}</p>
                                )}
                                
                                {/** Sessions */}
                                {sessions.map((session: ISession) => {
                                    const href: string = routes.sessionPath(session.sessionId);
                                    const isActive: boolean = pathname === href;

                                    return (
                                        <Link key={session.sessionId} href={href} title={session.title}
                                              className={cn(
                                                  'block px-3 py-1.5 rounded-md text-xs transition-colors truncate',
                                                  isActive
                                                      ? 'bg-primary/10 text-primary font-medium'
                                                      : 'text-text-muted hover:bg-surface-hover hover:text-text',
                                              )}
                                        >
                                            {session.title}
                                        </Link>
                                    );
                                })}

                                {/** Memories */}
                                {memories.map((memory: IMemory) => {
                                    const href: string = routes.memoryPath(memory.projectDir);
                                    const isActive: boolean = pathname === href;
                                    const fileName: string = memory.filePath.split('/').pop() || memory.filePath;

                                    return (
                                        <Link key={memory.memoryId} href={href} title={memory.filePath}
                                              className={cn(
                                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors truncate',
                                                  isActive
                                                      ? 'bg-primary/10 text-primary font-medium'
                                                      : 'text-text-muted hover:bg-surface-hover hover:text-text',
                                              )}
                                        >
                                            <HiOutlineDocumentText className={'size-3.5 shrink-0'}/>
                                            <span className={'truncate'}>{fileName}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

export {SidebarClient};