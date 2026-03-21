import {Suspense} from "react";
import {SidebarClient} from "@/components/SidebarClient";
import {getAllProjects} from "@/actions/project.actions";
import type {IGetAllProjectsResponse} from "@/types/project";

/** Skeleton shown while SidebarWrapper fetches projects */
function SidebarSkeleton() {
    return (
        <div className={'flex flex-col gap-0.5 animate-pulse'}>
            {/* Toolbar placeholder — mirrors the +/Import/Refresh row */}
            <div className={'flex justify-end gap-1 mb-1'}>
                <div className={'size-8 rounded-md bg-border'}/>
                <div className={'size-8 rounded-md bg-border'}/>
                <div className={'size-8 rounded-md bg-border'}/>
            </div>

            {/* Project row placeholders with varied widths for a natural look */}
            {([55, 72, 40, 63, 48] as const).map((width, i) => (
                <div key={i} className={'flex items-center gap-2 px-3 py-2 rounded-md'}>
                    {/* Chevron */}
                    <div className={'size-3 rounded bg-border shrink-0'}/>
                    {/* Folder icon */}
                    <div className={'size-4 rounded bg-border shrink-0'}/>
                    {/* Project name */}
                    <div className={'h-2.5 rounded-full bg-border'} style={{width: `${width}%`}}/>
                </div>
            ))}
        </div>
    );
}

async function Sidebar() {
    return (
        <Suspense fallback={<SidebarSkeleton/>}>
            <SidebarWrapper/>
        </Suspense>
    );
}

async function SidebarWrapper() {
    const {success, projects, error}: IGetAllProjectsResponse = await getAllProjects();

    if (!success) {
        return (
            <p className={'text-xs text-error text-center py-4'}>{error || 'Failed to load projects!'}</p>
        );
    }

    return (
        <SidebarClient projects={projects ?? []}/>
    );
}

export {Sidebar};
