"use client";

import React from "react";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {HiOutlineChatAlt2, HiOutlineChevronRight, HiOutlineClipboardList, HiOutlineDocumentText, HiOutlineFolder, HiOutlineRefresh} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {routes} from "@/utils/routes";
import type {ITask} from "@/types/task";
import type {IMemory} from "@/types/memory";
import {Button} from "@/components/ui/Button";
import type {ISession} from "@/types/session";
import {getAllTasks} from "@/actions/task.actions";
import {getAllMemories} from "@/actions/memory.actions";
import type {ISidebarClientProps} from "@/types/components";
import {DeleteProjectButton} from "@/components/DeleteProjectButton";
import {getAllSessions, refreshSidebar} from "@/actions/sessions.actions";

/** Task status indicator */
const TASK_STATUS_ICON: Record<string, { label: string; className: string }> = {
    completed: {label: '\u2713', className: 'text-success'},
    in_progress: {label: '\u25C9', className: 'text-warning'},
    pending: {label: '\u25CB', className: 'text-text-muted'},
    deleted: {label: '\u00D7', className: 'text-error'},
};

function SidebarClient({projects}: ISidebarClientProps) {
    const router = useRouter();
    const pathname: string = usePathname();
    const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(new Set());
    const [expandedSessions, setExpandedSessions] = React.useState<Set<string>>(new Set());
    const [expandedSessionTasks, setExpandedSessionTasks] = React.useState<Set<string>>(new Set());
    const [sessionsMap, setSessionsMap] = React.useState<Record<string, ISession[]>>({});
    const [tasksMap, setTasksMap] = React.useState<Record<string, ITask[]>>({});
    const [memoriesMap, setMemoriesMap] = React.useState<Record<string, IMemory[]>>({});
    const [loadingProject, setLoadingProject] = React.useState<string | null>(null);
    const [loadingTasks, setLoadingTasks] = React.useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false);

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

    const handleToggleSession = React.useCallback((sessionId: string): void => {
        setExpandedSessions((prev: Set<string>) => {
            const next: Set<string> = new Set(prev);
            if (next.has(sessionId)) {
                next.delete(sessionId);
            } else {
                next.add(sessionId);
            }
            return next;
        });
    }, []);

    const handleToggleSessionTasks = React.useCallback(async (sessionId: string): Promise<void> => {
        setExpandedSessionTasks((prev: Set<string>) => {
            const next: Set<string> = new Set(prev);
            if (next.has(sessionId)) {
                next.delete(sessionId);
            } else {
                next.add(sessionId);
            }
            return next;
        });

        if (tasksMap[sessionId]) return;

        setLoadingTasks(sessionId);
        const {success, tasks} = await getAllTasks({sessionId, limit: 50});
        setLoadingTasks(null);

        if (success && tasks && tasks.length !== 0) {
            setTasksMap((prev) => ({...prev, [sessionId]: tasks}));
        }
    }, [tasksMap]);

    const handleRefresh = React.useCallback(async (): Promise<void> => {
        setIsRefreshing(true);

        // Invalidate server-side caches
        await refreshSidebar();

        // Re-fetch data for all expanded projects
        const expandedProjectDirs: string[] = Array.from(expandedProjects);
        const projectFetches = expandedProjectDirs.map(async (projectDir: string) => {
            const [sessionsResult, memoriesResult] = await Promise.all([
                getAllSessions({projectDir, limit: 50}),
                getAllMemories({projectDir, limit: 50}),
            ]);
            return {projectDir, sessionsResult, memoriesResult};
        });

        // Re-fetch tasks for all expanded session tasks
        const expandedTaskSessionIds: string[] = Array.from(expandedSessionTasks);
        const taskFetches = expandedTaskSessionIds.map(async (sessionId: string) => {
            const result = await getAllTasks({sessionId, limit: 50});
            return {sessionId, result};
        });

        const [projectResults, taskResults] = await Promise.all([
            Promise.all(projectFetches),
            Promise.all(taskFetches),
        ]);

        // Update sessions + memories maps
        const newSessionsMap: Record<string, ISession[]> = {};
        const newMemoriesMap: Record<string, IMemory[]> = {};
        for (const {projectDir, sessionsResult, memoriesResult} of projectResults) {
            if (sessionsResult.success && sessionsResult.sessions && sessionsResult.sessions.length !== 0) {
                newSessionsMap[projectDir] = sessionsResult.sessions;
            }
            if (memoriesResult.success && memoriesResult.memories && memoriesResult.memories.length !== 0) {
                newMemoriesMap[projectDir] = memoriesResult.memories;
            }
        }
        setSessionsMap(newSessionsMap);
        setMemoriesMap(newMemoriesMap);

        // Update tasks map
        const newTasksMap: Record<string, ITask[]> = {};
        for (const {sessionId, result} of taskResults) {
            if (result.success && result.tasks && result.tasks.length !== 0) {
                newTasksMap[sessionId] = result.tasks;
            }
        }
        setTasksMap(newTasksMap);

        // Re-run server component tree (refreshes the projects list prop)
        router.refresh();
        setIsRefreshing(false);
    }, [expandedProjects, expandedSessionTasks, router]);

    /** Clear all caches for a project when it is deleted via DeleteProjectButton */
    React.useEffect(() => {
        const handler = (e: Event): void => {
            const {projectDir} = (e as CustomEvent<{ projectDir: string }>).detail;
            console.log('[SidebarClient] received project-deleted event:', {projectDir});
            const sessionIds: string[] = (sessionsMap[projectDir] ?? []).map((s: ISession) => s.sessionId);
            setSessionsMap((prev: Record<string, ISession[]>) => {
                const next: Record<string, ISession[]> = {...prev};
                delete next[projectDir];
                return next;
            });
            setMemoriesMap((prev: Record<string, IMemory[]>) => {
                const next: Record<string, IMemory[]> = {...prev};
                delete next[projectDir];
                return next;
            });
            setTasksMap((prev: Record<string, ITask[]>) => {
                const next: Record<string, ITask[]> = {...prev};
                for (const id of sessionIds) {
                    delete next[id];
                }
                return next;
            });
            setExpandedProjects((prev: Set<string>) => {
                const next: Set<string> = new Set(prev);
                next.delete(projectDir);
                return next;
            });
        };

        window.addEventListener('project-deleted', handler);
        return () => window.removeEventListener('project-deleted', handler);
    }, [sessionsMap]);

    /** Clear sessionsMap entry when a session is deleted via DeleteSessionButton */
    React.useEffect(() => {
        const handler = (e: Event): void => {
            const {sessionId} = (e as CustomEvent<{ sessionId: string }>).detail;
            console.log('[SidebarClient] received session-deleted event:', {sessionId});
            setSessionsMap((prev: Record<string, ISession[]>) => {
                const next: Record<string, ISession[]> = {...prev};
                for (const key of Object.keys(next)) {
                    const filtered: ISession[] = next[key].filter((session: ISession) => session.sessionId !== sessionId);
                    if (filtered.length !== next[key].length) {
                        if (filtered.length === 0) {
                            delete next[key];
                        } else {
                            next[key] = filtered;
                        }
                        break;
                    }
                }
                return next;
            });
            setTasksMap((prev: Record<string, ITask[]>) => {
                const next: Record<string, ITask[]> = {...prev};
                delete next[sessionId];
                return next;
            });
        };

        window.addEventListener('session-deleted', handler);
        return () => window.removeEventListener('session-deleted', handler);
    }, []);

    /** Clear tasksMap entry when tasks are deleted via DeleteTasksButton */
    React.useEffect(() => {
        const handler = (e: Event): void => {
            const {sessionId} = (e as CustomEvent<{ sessionId: string }>).detail;
            console.log('[SidebarClient] received tasks-deleted event:', {sessionId});
            setTasksMap((prev: Record<string, ITask[]>) => {
                const next: Record<string, ITask[]> = {...prev};
                delete next[sessionId];
                return next;
            });
        };

        window.addEventListener('tasks-deleted', handler);
        return () => window.removeEventListener('tasks-deleted', handler);
    }, []);

    /** Clear memoriesMap entry when a memory is deleted via DeleteMemoryButton */
    React.useEffect(() => {
        const handler = (e: Event): void => {
            const {projectDir} = (e as CustomEvent<{ projectDir: string }>).detail;
            console.log('[SidebarClient] received memory-deleted event:', {projectDir});
            setMemoriesMap((prev: Record<string, IMemory[]>) => {
                const next: Record<string, IMemory[]> = {...prev};
                const matchingKey: string | undefined = Object.keys(next).find((key: string) =>
                    next[key].some((memory: IMemory) => memory.projectDir === projectDir),
                );
                if (matchingKey) delete next[matchingKey];
                return next;
            });
        };

        window.addEventListener('memory-deleted', handler);
        return () => window.removeEventListener('memory-deleted', handler);
    }, []);

    if (projects.length === 0) {
        return (
            <div className={'flex flex-col gap-2'}>
                <div className={'flex justify-end'}>
                    <Button variant={'ghost'} size={'sm'} onClick={handleRefresh} disabled={isRefreshing} className={'p-1.5'} title={'Refresh sidebar'}>
                        <HiOutlineRefresh className={cn('size-3.5', isRefreshing && 'animate-spin')}/>
                    </Button>
                </div>
                <p className={'text-xs text-text-muted text-center py-4'}>No projects yet</p>
            </div>
        );
    }

    return (
        <nav className={'flex flex-col gap-0.5'}>
            <div className={'flex justify-end mb-1'}>
                <Button variant={'ghost'} size={'sm'} onClick={handleRefresh} disabled={isRefreshing} className={'p-1.5'} title={'Refresh sidebar'}>
                    <HiOutlineRefresh className={cn('size-3.5', isRefreshing && 'animate-spin')}/>
                </Button>
            </div>
            {projects.map((projectDir: string) => {
                const projectName: string = projectDir.split('/').filter(Boolean).pop() || projectDir;
                const isExpanded: boolean = expandedProjects.has(projectDir);
                const sessions: ISession[] = sessionsMap[projectDir] ?? [];
                const memories: IMemory[] = memoriesMap[projectDir] ?? [];
                const isLoading: boolean = loadingProject === projectDir;

                return (
                    <div key={projectDir}>
                        {/* Project header */}
                        <div className={'flex items-center'}>
                            <Button variant={'ghost'} size={'sm'} onClick={() => handleToggleProject(projectDir)}
                                    className={'flex items-center justify-start gap-2 flex-1 min-w-0 px-3 py-2 text-sm text-text'}>
                                <HiOutlineChevronRight className={cn('size-3 shrink-0 transition-transform', isExpanded && 'rotate-90')}/>
                                <HiOutlineFolder className={'size-4 shrink-0 text-text-muted'}/>
                                <span className={'truncate font-medium'} title={projectDir}>{projectName}</span>
                            </Button>
                            <div className={'shrink-0 pr-1'}>
                                <DeleteProjectButton projectDir={projectDir} projectName={projectName}/>
                            </div>
                        </div>

                        {/* Project contents */}
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
                                    const isSessionExpanded: boolean = expandedSessions.has(session.sessionId);
                                    const chatHref: string = routes.sessionPath(session.sessionId);
                                    const isChatActive: boolean = pathname === chatHref;
                                    const tasks: ITask[] = tasksMap[session.sessionId] ?? [];
                                    const isTasksExpanded: boolean = expandedSessionTasks.has(session.sessionId);
                                    const isTasksLoading: boolean = loadingTasks === session.sessionId;

                                    return (
                                        <div key={session.sessionId}>
                                            {/* Session header */}
                                            <Button variant={'ghost'} size={'sm'} onClick={() => handleToggleSession(session.sessionId)} title={session.title}
                                                    className={cn(
                                                        'flex items-center justify-start gap-1.5 w-full px-3 py-1.5 rounded-md text-xs transition-colors truncate',
                                                        isChatActive
                                                            ? 'bg-primary/10 text-primary font-medium'
                                                            : 'text-text-muted hover:bg-surface-hover hover:text-text',
                                                    )}
                                            >
                                                <HiOutlineChevronRight className={cn('size-2.5 shrink-0 transition-transform', isSessionExpanded && 'rotate-90')}/>
                                                <span className={'truncate'}>{session.title}</span>
                                            </Button>

                                            {/* Session sub-items */}
                                            {isSessionExpanded && (
                                                <div className={'ml-4 flex flex-col gap-0.5 mt-0.5'}>
                                                    {/* Chat link */}
                                                    <Link href={chatHref} title={'Chat'}
                                                          className={cn(
                                                              'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-colors',
                                                              isChatActive ? 'bg-primary/10 text-primary font-medium' : 'text-text-muted hover:bg-surface-hover hover:text-text',
                                                          )}
                                                    >
                                                        <HiOutlineChatAlt2 className={'size-3.5 shrink-0'}/>
                                                        <span>{'Chat'}</span>
                                                    </Link>

                                                    {/* Tasks toggle */}
                                                    <Button variant={'ghost'} size={'sm'} onClick={() => handleToggleSessionTasks(session.sessionId)}
                                                            className={'flex items-center justify-start gap-1.5 w-full px-3 py-1 rounded-md text-xs text-text-muted hover:bg-surface-hover hover:text-text transition-colors'}>
                                                        <HiOutlineClipboardList className={'size-3.5 shrink-0'}/>
                                                        <span>{'Tasks'}</span>
                                                        <HiOutlineChevronRight className={cn('size-2.5 shrink-0 transition-transform ml-auto', isTasksExpanded && 'rotate-90')}/>
                                                    </Button>

                                                    {/* Tasks list */}
                                                    {isTasksExpanded && (
                                                        <div className={'ml-4 flex flex-col gap-0.5'}>
                                                            {isTasksLoading && (
                                                                <p className={'text-[10px] text-text-muted px-3 py-1'}>{'Loading...'}</p>
                                                            )}
                                                            {(!isTasksLoading && tasks.length === 0) && (
                                                                <p className={'text-[10px] text-text-muted px-3 py-1'}>{'No tasks'}</p>
                                                            )}
                                                            {tasks.map((task: ITask) => {
                                                                const statusInfo = TASK_STATUS_ICON[task.status] ?? TASK_STATUS_ICON.pending;
                                                                const taskHref: string = routes.taskPath(task.sessionId, task.taskId);
                                                                const isTaskActive: boolean = pathname === taskHref;

                                                                return (
                                                                    <Link key={task.taskId} href={taskHref} title={task.description}
                                                                          className={cn(
                                                                              'flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] transition-colors truncate',
                                                                              isTaskActive
                                                                                  ? 'bg-primary/10 text-primary font-medium'
                                                                                  : 'text-text-muted hover:bg-surface-hover hover:text-text',
                                                                          )}
                                                                    >
                                                                        <span className={cn('shrink-0 text-xs', isTaskActive ? '' : statusInfo.className)}>{statusInfo.label}</span>
                                                                        <span className={'truncate'}>{task.subject}</span>
                                                                    </Link>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
