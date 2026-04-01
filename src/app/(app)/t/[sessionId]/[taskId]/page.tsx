import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {TaskView} from "@/components/TaskView";
import {getTask} from "@/actions/task.actions";
import type {ITaskPageProps} from "@/types/components";
import type {IGetTaskResponse, ITask} from "@/types/task";

export async function generateMetadata({params}: ITaskPageProps): Promise<Metadata> {
    const {sessionId, taskId} = await params;
    const {task}: IGetTaskResponse = await getTask({sessionId, taskId});
    const taskTitle: string = (task as ITask | undefined)?.subject ?? 'Task';
    return {title: `${taskTitle} | Claude Lens`};
}

async function TaskPage({params}: ITaskPageProps) {
    const {sessionId, taskId} = await params;
    const {success, task, error}: IGetTaskResponse = await getTask({sessionId, taskId});

    if (!success || !task) {
        if (error?.includes('Invalid') || error?.includes('No task found')) {
            notFound();
        }

        return (
            <div className={'flex items-center justify-center h-full'}>
                <p className={'text-sm text-error'}>{error || 'Failed to load task!'}</p>
            </div>
        );
    }

    return (
        <TaskView task={task}/>
    );
}

export default TaskPage;
