import React from "react";
import Link from "next/link";
import remarkGfm from "remark-gfm";
import Markdown from "react-markdown";
import {cn} from "@/utils/cn";
import {routes} from "@/utils/routes";
import {ETaskStatus} from "@/types/task";
import type {ITaskViewProps} from "@/types/components";
import {CopyMessageButton} from "@/components/CopyMessageButton";
import {DeleteTasksButton} from "@/components/DeleteTasksButton";
import {renderCode, renderPre, renderLink} from "@/components/CodeBlock";

const STATUS_CONFIG: Record<ETaskStatus, { label: string; className: string }> = {
    [ETaskStatus.PENDING]: {label: 'Pending', className: 'bg-surface text-text-muted border border-border'},
    [ETaskStatus.IN_PROGRESS]: {label: 'In Progress', className: 'bg-warning/15 text-warning border border-warning/30'},
    [ETaskStatus.COMPLETED]: {label: 'Completed', className: 'bg-success/15 text-success border border-success/30'},
    [ETaskStatus.DELETED]: {label: 'Deleted', className: 'bg-error/15 text-error border border-error/30'},
};

function buildCopyText(task: ITaskViewProps['task'], statusLabel: string): string {
    const lines: string[] = [
        `## ${task.taskId} — ${statusLabel}`,
        `### ${task.subject}`,
        '',
        `Description: ${task.description}`,
    ];
    if (task.activeForm) {
        lines.push('', `Active Form: ${task.activeForm}`);
    }
    if (task.blockedBy.length > 0) {
        lines.push('', `Blocked by: ${task.blockedBy.map((taskId: string) => `#${taskId}`).join(', ')}`);
    }
    if (task.blocks.length > 0) {
        lines.push('', `Blocks: ${task.blocks.map((taskId: string) => `#${taskId}`).join(', ')}`);
    }
    return lines.join('\n');
}

function TaskView({task}: ITaskViewProps) {
    const statusConfig = STATUS_CONFIG[task.status];
    const copyText: string = buildCopyText(task, statusConfig.label);

    return (
        <div className={'flex flex-col h-full'}>
            {/* Header */}
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <div className={'flex items-center justify-between'}>
                    <div className={'flex items-center gap-2'}>
                        <span className={'text-xs text-text-muted font-mono'}>{'#'}{task.taskId}</span>
                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', statusConfig.className)}>
                            {statusConfig.label}
                        </span>
                    </div>
                    <div className={'flex items-center gap-1'}>
                        <CopyMessageButton text={copyText}/>
                        <DeleteTasksButton sessionId={task.sessionId}/>
                    </div>
                </div>
                <h1 className={'text-sm font-semibold mt-1'}>{task.subject}</h1>
                <Link href={routes.sessionPath(task.sessionId)} className={'text-xs text-text-muted hover:text-primary transition-colors mt-0.5 block truncate'}>
                    Session {'↗ '}
                </Link>
            </div>

            {/* Body */}
            <div className={'flex-1 overflow-y-auto px-6 py-4'}>
                <div className={'max-w-2xl mx-auto flex flex-col gap-5'}>
                    {/* Description */}
                    <section>
                        <p className={'text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5'}>{'Description'}</p>
                        <div className={'markdown-content text-sm'}>
                            <Markdown remarkPlugins={[remarkGfm]} components={{code: renderCode, pre: renderPre, a: renderLink}}>
                                {task.description}
                            </Markdown>
                        </div>
                    </section>

                    {/* Active form — only when in progress */}
                    {task.activeForm && (
                        <section>
                            <p className={'text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5'}>{'Active Form'}</p>
                            <p className={'text-sm text-text'}>{task.activeForm}</p>
                        </section>
                    )}

                    {/* Dependencies */}
                    {(task.blockedBy.length > 0 || task.blocks.length > 0) && (
                        <section>
                            <p className={'text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5'}>{'Dependencies'}</p>
                            <div className={'flex flex-col gap-1.5'}>
                                {task.blockedBy.length > 0 && (
                                    <div className={'flex items-center gap-2 flex-wrap'}>
                                        <span className={'text-xs text-text-muted shrink-0'}>{'Blocked by:'}</span>
                                        {task.blockedBy.map((taskId: string) => (
                                            <Link key={taskId} href={routes.taskPath(task.sessionId, taskId)}
                                                  className={'text-xs font-mono px-1.5 py-0.5 rounded bg-error/10 text-error border border-error/20'}>{'#'}{taskId}</Link>
                                        ))}
                                    </div>
                                )}
                                {task.blocks.length > 0 && (
                                    <div className={'flex items-center gap-2 flex-wrap'}>
                                        <span className={'text-xs text-text-muted shrink-0'}>{'Blocks:'}</span>
                                        {task.blocks.map((taskId: string) => (
                                            <Link key={taskId} href={routes.taskPath(task.sessionId, taskId)}
                                                  className={'text-xs font-mono px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20'}>{'#'}{taskId}</Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

export {TaskView};
