import {SidebarClient} from "@/components/SidebarClient";
import {getProjects} from "@/actions/conversations.actions";
import type {IGetProjectsResponse} from "@/types/conversation";

async function Sidebar() {
    const {success, projects, error}: IGetProjectsResponse = await getProjects();

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
