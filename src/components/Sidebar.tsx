import {SidebarClient} from "@/components/SidebarClient";
import {getAllProjects} from "@/actions/sessionss.actions";
import type {IGetAllProjectsResponse} from "@/types/session";

async function Sidebar() {
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
