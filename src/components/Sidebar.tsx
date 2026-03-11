import {Suspense} from "react";
import {SidebarClient} from "@/components/SidebarClient";
import {getAllProjects} from "@/actions/project.actions";
import type {IGetAllProjectsResponse} from "@/types/project";

async function Sidebar() {
    return (
        <Suspense fallback={'Loading projects...'}>
            <SidebarWrapper/>
        </Suspense>
    );
}

async function SidebarWrapper() {
    const {success, projects, error}: IGetAllProjectsResponse = await getAllProjects();

    if (!success) {
        return (
            <p className={'text-xs text-error font-bold text-center py-4'}>{error || 'Failed to load projects!'}</p>
        );
    }

    return (
        <SidebarClient projects={projects ?? []}/>
    );
}

export {Sidebar};
