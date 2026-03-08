import {notFound} from "next/navigation";
import {TaskView} from "@/components/TaskView";
import {getTask} from "@/actions/task.actions";
import type {IGetTaskResponse} from "@/types/task";
import type {ITaskPageProps} from "@/types/components";

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
