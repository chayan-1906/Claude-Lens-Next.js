"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {
    HiDotsVertical,
    HiOutlineChatAlt2,
    HiOutlineChevronRight,
    HiOutlineClipboardList,
    HiOutlineDocumentText,
    HiOutlineDownload,
    HiOutlineFolder,
    HiOutlinePencil,
    HiOutlinePlus,
    HiOutlineRefresh,
    HiOutlineSearch,
    HiOutlineTrash
} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {routes} from "@/utils/routes";
import {assets} from "@/utils/assets";
import type {ITask} from "@/types/task";
import type {IMemory} from "@/types/memory";
import {Modal} from "@/components/ui/Modal";
import {Button} from "@/components/ui/Button";
import type {IProject} from "@/types/project";
import type {ISession} from "@/types/session";
import {getAllTasks} from "@/actions/task.actions";
import {SearchModal} from "@/components/SearchModal";
import {getExportUrl} from "@/actions/export.actions";
import {deleteProject} from "@/actions/project.actions";
import {getAllMemories} from "@/actions/memory.actions";
import type {ISidebarClientProps} from "@/types/components";
import {ImportZipButton} from "@/components/ImportZipButton";
import {RenameProjectModal} from "@/components/RenameProjectModal";
import {DeleteSessionButton} from "@/components/DeleteSessionButton";
import {ExportSessionButton} from "@/components/ExportSessionButton";
import {getAllSessions, refreshSidebar} from "@/actions/session.actions";

/**
 * Compute a unique display name for each project using the minimum number of
 * trailing path segments needed to disambiguate — same algorithm VS Code uses
 * for editor tabs. e.g. two projects both named "claude-lens" become
 * "all-next-js-projects/claude-lens" and "NodeJs/claude-lens".
 * Projects with a customName bypass disambiguation entirely.
 */
function computeProjectDisplayNames(projects: IProject[]): Map<string, string> {
    const projectsToDisambiguate: IProject[] = projects.filter((p: IProject) => !p.customName);
    const depths: Map<string, number> = new Map(projectsToDisambiguate.map((project: IProject) => [project.rawProjectDir, 1]),)

    let hasConflicts: boolean = true;
    while (hasConflicts) {
        hasConflicts = false;

        const currentNames: Map<string, string> = new Map();
        for (const [rawDir, depth] of depths) {
            const parts: string[] = rawDir.split('/').filter(Boolean);
            currentNames.set(rawDir, parts.slice(Math.max(0, parts.length - depth)).join('/'));
        }

        const nameGroups: Map<string, string[]> = new Map();
        for (const [rawDir, name] of currentNames) {
            if (!nameGroups.has(name)) nameGroups.set(name, []);
            nameGroups.get(name)!.push(rawDir);
        }

        for (const dirs of nameGroups.values()) {
            if (dirs.length > 1) {
                hasConflicts = true;
                for (const dir of dirs) {
                    const maxDepth: number = dir.split('/').filter(Boolean).length;
                    depths.set(dir, Math.min(depths.get(dir)! + 1, maxDepth));
                }
            }
        }
    }

    const result: Map<string, string> = new Map();
    for (const [rawDir, depth] of depths) {
        const parts: string[] = rawDir.split('/').filter(Boolean);
        result.set(rawDir, parts.slice(Math.max(0, parts.length - depth)).join('/') || rawDir);
    }
    for (const project of projects) {
        if (project.customName) result.set(project.rawProjectDir, project.customName);
    }
    return result;
}

/** Task status indicator */
const TASK_STATUS_ICON: Record<string, { label: string; className: string }> = {
    completed: {label: '\u2713', className: 'text-success'},
    in_progress: {label: '\u25C9', className: 'text-warning'},
    pending: {label: '\u25CB', className: 'text-text-muted'},
    deleted: {label: '\u00D7', className: 'text-error'},
};

function SidebarClient({projects, r2Configured}: ISidebarClientProps) {
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
    const [openProjectMenu, setOpenProjectMenu] = React.useState<string | null>(null);
    const [exportingProject, setExportingProject] = React.useState<string | null>(null);
    const [deleteModalProject, setDeleteModalProject] = React.useState<IProject | null>(null);
    const [isDeletingProject, setIsDeletingProject] = React.useState<boolean>(false);
    const [deleteProjectReclaimR2, setDeleteProjectReclaimR2] = React.useState<boolean>(false);
    const [deleteProjectError, setDeleteProjectError] = React.useState<string | null>(null);
    const [isRenameProjectModalOpen, setIsRenameProjectModalOpen] = React.useState<boolean>(false);
    const [selectedProjectForRename, setSelectedProjectForRename] = React.useState<IProject | null>(null);
    const [searchProject, setSearchProject] = React.useState<IProject | null>(null);

    const {sortedProjects, displayNames} = React.useMemo(() => {
        // Filter out projects with empty rawProjectDir — backend may return these transiently
        // before JSONL sync completes for sessions started without a project directory.
        const validProjects: IProject[] = projects.filter((project: IProject) => project.rawProjectDir.trim() !== '');
        const names: Map<string, string> = computeProjectDisplayNames(validProjects);
        const sorted: IProject[] = [...validProjects].sort((a: IProject, b: IProject) =>
            (names.get(a.rawProjectDir) ?? '').toLowerCase().localeCompare((names.get(b.rawProjectDir) ?? '').toLowerCase()),
        );
        return {sortedProjects: sorted, displayNames: names};
    }, [projects]);

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

    const handleExportProject = React.useCallback(async (projectDir: string): Promise<void> => {
        setExportingProject(projectDir);
        setOpenProjectMenu(null);
        try {
            const {success, url, error} = await getExportUrl({projectDir});
            if (!success || !url) {
                console.error('Export URL error:', error);
                return;
            }
            const a: HTMLAnchorElement = document.createElement('a');
            a.href = url;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error: unknown) {
            console.error('Export error:', error);
        } finally {
            setExportingProject(null);
        }
    }, []);

    const handleDeleteProject = React.useCallback(async (): Promise<void> => {
        if (!deleteModalProject) return;
        setIsDeletingProject(true);
        setDeleteProjectError(null);
        const {success, error} = await deleteProject({projectDir: deleteModalProject.projectDir, reclaimR2: deleteProjectReclaimR2});
        if (!success) {
            setDeleteProjectError(error || 'Failed to delete project!');
            setIsDeletingProject(false);
            return;
        }
        console.log('[SidebarClient] dispatching project-deleted event:', {projectDir: deleteModalProject.projectDir});
        window.dispatchEvent(new CustomEvent('project-deleted', {detail: {projectDir: deleteModalProject.projectDir}}));
        setDeleteModalProject(null);
        setIsDeletingProject(false);
        router.push(routes.homePath);
    }, [deleteModalProject, deleteProjectReclaimR2, router]);

    const handleProjectRenamed = React.useCallback((_updatedProject: IProject): void => {
        setIsRenameProjectModalOpen(false);
        setSelectedProjectForRename(null);
        router.refresh();
    }, [router]);

    /** Clear all caches for a project when it is deleted */
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

    /** Update sessionsMap entry when a session is renamed via RenameSessionModal */
    React.useEffect(() => {
        const handler = (e: Event): void => {
            const {session: updatedSession} = (e as CustomEvent<{ session: ISession }>).detail;
            console.log('[SidebarClient] received session-renamed event:', {sessionId: updatedSession.sessionId, title: updatedSession.title});
            setSessionsMap((prev: Record<string, ISession[]>) => {
                const next: Record<string, ISession[]> = {...prev};
                for (const key of Object.keys(next)) {
                    const index: number = next[key].findIndex((s: ISession) => s.sessionId === updatedSession.sessionId);
                    if (index !== -1) {
                        next[key] = [...next[key]];
                        next[key][index] = {...next[key][index], title: updatedSession.title, description: updatedSession.description};
                        break;
                    }
                }
                return next;
            });
        };

        window.addEventListener('session-renamed', handler);
        return () => window.removeEventListener('session-renamed', handler);
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

    /** Re-fetch sessions + memories for expanded projects when a new session is created */
    React.useEffect(() => {
        const handler = async (): Promise<void> => {
            console.log('[SidebarClient] received session-created event');
            const expandedProjectDirs: string[] = Array.from(expandedProjects);
            if (expandedProjectDirs.length === 0) return;

            const fetches = expandedProjectDirs.map(async (projectDir: string) => {
                const [sessionsResult, memoriesResult] = await Promise.all([
                    getAllSessions({projectDir, limit: 50}),
                    getAllMemories({projectDir, limit: 50}),
                ]);
                return {projectDir, sessionsResult, memoriesResult};
            });

            const results = await Promise.all(fetches);

            setSessionsMap((prev: Record<string, ISession[]>) => {
                const next: Record<string, ISession[]> = {...prev};
                for (const {projectDir, sessionsResult} of results) {
                    if (sessionsResult.success && sessionsResult.sessions && sessionsResult.sessions.length !== 0) {
                        next[projectDir] = sessionsResult.sessions;
                    }
                }
                return next;
            });
            setMemoriesMap((prev: Record<string, IMemory[]>) => {
                const next: Record<string, IMemory[]> = {...prev};
                for (const {projectDir, memoriesResult} of results) {
                    if (memoriesResult.success && memoriesResult.memories && memoriesResult.memories.length !== 0) {
                        next[projectDir] = memoriesResult.memories;
                    }
                }
                return next;
            });
        };

        window.addEventListener('session-created', handler);
        return () => window.removeEventListener('session-created', handler);
    }, [expandedProjects]);

    /** Close open project context menu when clicking anywhere on the document */
    React.useEffect(() => {
        if (!openProjectMenu) return;
        const handler = (): void => setOpenProjectMenu(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [openProjectMenu]);

    if (projects.length === 0) {
        return (
            <div className={'flex flex-col gap-3'}>
                {/* Toolbar */}
                <div className={'flex justify-end gap-1'}>
                    <Link href={routes.newSessionPath} className={'inline-flex items-center justify-center size-8 rounded-md text-text hover:bg-border active:bg-border transition-colors'}
                          title={'New chat'}>
                        <HiOutlinePlus className={'size-3.5'}/>
                    </Link>
                    <ImportZipButton onImported={handleRefresh}/>
                    <Button variant={'ghost'} size={'sm'} onClick={handleRefresh} disabled={isRefreshing} className={'p-1.5'} title={'Refresh sidebar'}>
                        <HiOutlineRefresh className={cn('size-3.5', isRefreshing && 'animate-spin')}/>
                    </Button>
                </div>

                {/* Empty state */}
                <div className={'flex flex-col items-center gap-3 py-8 px-3 text-center'}>
                    <div className={'relative size-12 rounded-2xl overflow-hidden ring-1 ring-border shadow-sm'}>
                        <Image src={assets.logo} alt={'Claude Lens'} fill unoptimized className={'object-cover'}/>
                    </div>
                    <div className={'space-y-1'}>
                        <p className={'text-xs font-semibold text-text'}>No projects yet</p>
                        <p className={'text-[10px] text-text-muted leading-relaxed'}>Start a new chat to create your first session</p>
                    </div>
                    <Link href={routes.newSessionPath}
                          className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-background text-[11px] font-semibold hover:bg-dark-primary active:scale-95 transition-all'}>
                        <HiOutlinePlus className={'size-3'}/>
                        New Chat
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <nav className={'flex flex-col gap-0.5'}>
                <div className={'flex justify-end gap-1 mb-1'}>
                    <Link href={routes.newSessionPath} className={'inline-flex items-center justify-center size-8 rounded-md text-text hover:bg-surface active:bg-border transition-colors'}
                          title={'New chat'}>
                        <HiOutlinePlus className={'size-3.5'}/>
                    </Link>
                    <ImportZipButton onImported={handleRefresh}/>
                    <Button variant={'ghost'} size={'sm'} onClick={handleRefresh} disabled={isRefreshing} className={'p-1.5'} title={'Refresh sidebar'}>
                        <HiOutlineRefresh className={cn('size-3.5', isRefreshing && 'animate-spin')}/>
                    </Button>
                </div>
                {sortedProjects.map((project: IProject) => {
                    const {rawProjectDir, projectDir} = project;
                    const projectName: string = displayNames.get(rawProjectDir) || projectDir;
                    const isExpanded: boolean = expandedProjects.has(projectDir);
                    const allSessions: ISession[] = sessionsMap[projectDir] ?? [];
                    // Hide parent sessions — show only leaf sessions (those not superseded by a fork)
                    const parentSessionIds: Set<string> = new Set(
                        allSessions.filter((session: ISession) => session.parentSessionId).map((session: ISession) => session.parentSessionId!),
                    );
                    const sessions: ISession[] = allSessions
                        .filter((s: ISession) => !parentSessionIds.has(s.sessionId))
                        .sort((a: ISession, b: ISession) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
                    const memories: IMemory[] = memoriesMap[projectDir] ?? [];
                    const isLoading: boolean = loadingProject === projectDir;

                    return (
                        <div key={projectDir}>
                            {/* Project header */}
                            <div className={'flex items-center'}>
                                <Button variant={'ghost'} size={'sm'} onClick={() => handleToggleProject(projectDir)}
                                        title={rawProjectDir}
                                        className={'flex items-center justify-start gap-2 flex-1 min-w-0 px-3 py-2 text-sm text-text hover:bg-border transition-colors active:scale-100'}>
                                    <HiOutlineChevronRight className={cn('size-3 shrink-0 transition-transform', isExpanded && 'rotate-90')}/>
                                    <HiOutlineFolder className={'size-4 shrink-0 text-text-muted'}/>
                                    <span className={'truncate font-medium'}>{projectName}</span>
                                </Button>
                                <div className={'relative shrink-0 pr-1 flex items-center'}>
                                    <Button variant={'ghost'} size={'sm'} onClick={(e: React.MouseEvent) => {
                                        e.stopPropagation();
                                        setSearchProject(project);
                                    }} className={'p-1.5 rounded-md text-text-muted hover:text-text'} title={'Search in project'}>
                                        <HiOutlineSearch className={'size-3.5'}/>
                                    </Button>
                                    <Button variant={'ghost'} size={'sm'}
                                            onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                setOpenProjectMenu(openProjectMenu === projectDir ? null : projectDir);
                                            }}
                                            className={'p-1.5 rounded-md text-text-muted hover:text-text'} title={'Project options'}>
                                        <HiDotsVertical className={'size-3.5'}/>
                                    </Button>
                                    {openProjectMenu === projectDir && (
                                        <div className={'absolute right-0 top-full mt-1 w-40 bg-surface border border-border rounded-md shadow-md z-50 py-1'}>
                                            <Button type={'button'} variant={'ghost'} size={'sm'}
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        handleExportProject(projectDir);
                                                    }}
                                                    disabled={exportingProject === projectDir}
                                                    className={'flex items-center justify-start gap-2 w-full px-3 py-1.5 text-xs text-text hover:bg-border transition-colors rounded-none'}>
                                                <HiOutlineDownload className={'size-3.5 shrink-0'}/>
                                                {exportingProject === projectDir ? 'Exporting...' : 'Export'}
                                            </Button>
                                            <Button type={'button'} variant={'ghost'} size={'sm'}
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        setSelectedProjectForRename(project);
                                                        setIsRenameProjectModalOpen(true);
                                                        setOpenProjectMenu(null);
                                                    }}
                                                    className={'flex items-center justify-start gap-2 w-full px-3 py-1.5 text-xs text-text hover:bg-border transition-colors rounded-none'}>
                                                <HiOutlinePencil className={'size-3.5 shrink-0'}/>
                                                Rename
                                            </Button>
                                            <Button type={'button'} variant={'ghost'} size={'sm'}
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        setDeleteModalProject(project);
                                                        setDeleteProjectReclaimR2(false);
                                                        setDeleteProjectError(null);
                                                        setOpenProjectMenu(null);
                                                    }}
                                                    className={'flex items-center justify-start gap-2 w-full px-3 py-1.5 text-xs text-error hover:bg-error/10 transition-colors rounded-none'}>
                                                <HiOutlineTrash className={'size-3.5 shrink-0'}/>
                                                Delete
                                            </Button>
                                        </div>
                                    )}
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
                                                <div className={'flex items-center'}>
                                                    <Button variant={'ghost'} size={'sm'} onClick={() => handleToggleSession(session.sessionId)} title={session.title}
                                                            className={cn(
                                                                'flex items-center justify-start gap-1.5 flex-1 min-w-0 px-3 py-1.5 rounded-md text-xs transition-colors hover:bg-border truncate active:scale-100',
                                                                isChatActive
                                                                    ? 'bg-border text-primary font-medium'
                                                                    : 'text-text-muted hover:text-text',
                                                            )}
                                                    >
                                                        <HiOutlineChevronRight className={cn('size-2.5 shrink-0 transition-transform', isSessionExpanded && 'rotate-90')}/>
                                                        <span className={'truncate'}>{session.title}</span>
                                                    </Button>
                                                    <div className={'shrink-0 flex items-center'}>
                                                        <ExportSessionButton projectDir={projectDir} sessionId={session.sessionId}/>
                                                        <DeleteSessionButton sessionId={session.sessionId} sessionTitle={session.title} r2Configured={r2Configured}/>
                                                    </div>
                                                </div>

                                                {/* Session sub-items */}
                                                {isSessionExpanded && (
                                                    <div className={'ml-4 flex flex-col gap-0.5 mt-0.5'}>
                                                        {/* Chat link */}
                                                        <Button variant={'ghost'} size={'sm'} className={cn(
                                                            'justify-start w-full gap-1.5 text-xs transition-colors hover:bg-border active:scale-100',
                                                            isChatActive ? 'bg-border text-primary font-medium' : 'text-text-muted hover:text-text',
                                                        )}>
                                                            <Link href={chatHref} title={'Chat'} className={'flex items-center gap-1.5 w-full'}>
                                                                <HiOutlineChatAlt2 className={'size-3.5 shrink-0'}/>
                                                                <span>Chat</span>
                                                            </Link>
                                                        </Button>

                                                        {/* Tasks toggle */}
                                                        <Button variant={'ghost'} size={'sm'} onClick={() => handleToggleSessionTasks(session.sessionId)}
                                                                className={'flex items-center justify-start gap-1.5 w-full px-3 py-1 rounded-md text-xs text-text-muted hover:bg-border hover:text-text transition-colors active:scale-100'}>
                                                            <HiOutlineClipboardList className={'size-3.5 shrink-0'}/>
                                                            <span>Tasks</span>
                                                            <HiOutlineChevronRight className={cn('size-2.5 shrink-0 transition-transform ml-auto', isTasksExpanded && 'rotate-90')}/>
                                                        </Button>

                                                        {/* Tasks list */}
                                                        {isTasksExpanded && (
                                                            <div className={'ml-4 flex flex-col gap-0.5'}>
                                                                {isTasksLoading && (
                                                                    <p className={'text-[10px] text-text-muted px-3 py-1'}>Loading tasks...</p>
                                                                )}
                                                                {(!isTasksLoading && tasks.length === 0) && (
                                                                    <p className={'text-[10px] text-text-muted px-3 py-1'}>No tasks</p>
                                                                )}
                                                                {tasks.map((task: ITask) => {
                                                                    const statusInfo = TASK_STATUS_ICON[task.status] ?? TASK_STATUS_ICON.pending;
                                                                    const taskHref: string = routes.taskPath(task.sessionId, task.taskId);
                                                                    const isTaskActive: boolean = pathname === taskHref;

                                                                    return (
                                                                        <Link key={task.taskId} href={taskHref} title={task.description}
                                                                              className={cn(
                                                                                  'flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] transition-colors truncate active:scale-100',
                                                                                  isTaskActive
                                                                                      ? 'bg-border text-primary font-medium'
                                                                                      : 'text-text-muted hover:bg-border hover:text-text',
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
                                    {memories.length > 0 && (
                                        <Link href={routes.memoryPath(memories[0].projectDir)}
                                              className={cn(
                                                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors truncate active:scale-100',
                                                  pathname === routes.memoryPath(memories[0].projectDir)
                                                      ? 'bg-border text-primary font-medium'
                                                      : 'text-text-muted hover:bg-border hover:text-text',
                                              )}
                                        >
                                            <HiOutlineDocumentText className={'size-3.5 shrink-0'}/>
                                            <span className={'truncate'}>Memories</span>
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Delete project confirmation modal */}
            {deleteModalProject && (
                <Modal isOpen={!!deleteModalProject} onOpenChange={(open: boolean) => {
                    if (!open) setDeleteModalProject(null);
                }}>
                    <div className={'p-6'}>
                        <h2 className={'text-base font-semibold text-text'}>Delete Project</h2>
                        <p className={'text-sm text-text-muted mt-2'}>
                            Are you sure you want to delete{' '}
                            <span className={'font-medium text-text'}>{displayNames.get(deleteModalProject.rawProjectDir) ?? deleteModalProject.projectDir}</span>
                            ? This will permanently remove all sessions, messages, tasks, and memories for this project.
                        </p>
                        {r2Configured && (
                            <label className={'flex items-center gap-2 mt-4 cursor-pointer select-none'}>
                                <input type={'checkbox'} checked={deleteProjectReclaimR2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteProjectReclaimR2(e.target.checked)}
                                       className={'size-4 accent-warning cursor-pointer'}/>
                                <span className={'text-sm text-text-muted'}>Also reclaim R2 storage for this project</span>
                            </label>
                        )}
                        {deleteProjectError && (
                            <p className={'text-sm text-error mt-3 bg-error/10 px-3 py-2 rounded-md'}>{deleteProjectError}</p>
                        )}
                        <div className={'flex items-center justify-end gap-2 mt-5'}>
                            <Button variant={'ghost'} size={'sm'} onClick={() => setDeleteModalProject(null)} disabled={isDeletingProject}>Cancel</Button>
                            <Button variant={'danger'} size={'sm'} onClick={handleDeleteProject} isLoading={isDeletingProject}>Delete</Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Rename project modal */}
            {selectedProjectForRename && (
                <RenameProjectModal isOpen={isRenameProjectModalOpen} onOpenChange={setIsRenameProjectModalOpen} project={selectedProjectForRename} onSaved={handleProjectRenamed}/>
            )}

            {/* Project search modal */}
            <SearchModal isOpen={!!searchProject} onClose={() => setSearchProject(null)} defaultScope={'project'} projectDir={searchProject?.projectDir}/>
        </>
    );
}

export {SidebarClient};