import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {MemoryView} from "@/components/MemoryView";
import {getMemories} from "@/actions/memory.actions";
import {getAllProjects} from "@/actions/project.actions";
import type {IMemoryPageProps} from "@/types/components";
import type {IGetMemoryResponse, IMemory} from "@/types/memory";
import {DeleteMemoryButton} from "@/components/DeleteMemoryButton";
import type {IGetAllProjectsResponse, IProject} from "@/types/project";

export async function generateMetadata({params}: IMemoryPageProps): Promise<Metadata> {
    const {projectDir} = await params;
    const {projects} = await getAllProjects();
    const rawProjectDir: string = projects?.find((project: IProject) => project.projectDir === projectDir)?.rawProjectDir ?? projectDir;
    return {title: `${rawProjectDir} — Memories | Claude Lens`};
}

async function MemoryPage({params}: IMemoryPageProps) {
    const {projectDir} = await params;
    const [{success, memories, error}, {projects}]: [IGetMemoryResponse, IGetAllProjectsResponse] = await Promise.all([
        getMemories({projectDir}),
        getAllProjects(),
    ]);
    const rawProjectDir: string = projects?.find((project: IProject) => project.projectDir === projectDir)?.rawProjectDir ?? projectDir;

    if (!success || !memories || memories.length === 0) {
        if (error?.includes('Invalid projectDir') || error?.includes('No memories found')) {
            notFound();
        }

        return (
            <div className={'flex items-center justify-center h-full'}>
                <p className={'text-sm text-error'}>{error || 'Failed to load memories!'}</p>
            </div>
        );
    }

    const sorted: IMemory[] = [...memories].sort((a: IMemory, b: IMemory) => {
        const aName: string = a.filePath.split('/').pop() || '';
        const bName: string = b.filePath.split('/').pop() || '';
        if (aName === 'MEMORY.md') return -1;
        if (bName === 'MEMORY.md') return 1;
        return aName.localeCompare(bName);
    });

    return (
        <div>
            {/* Page header */}
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <div className={'flex items-center gap-1'}>
                    <h1 className={'text-sm font-semibold truncate'}>Memories</h1>
                    <div className={'ml-auto shrink-0'}>
                        <DeleteMemoryButton projectDir={projectDir}/>
                    </div>
                </div>
                <p className={'text-xs text-text-muted mt-0.5'}>{rawProjectDir}</p>
            </div>

            {/* Stacked memory files */}
            {sorted.map((memory: IMemory) => {
                const fileName: string = memory.filePath.split('/').pop() || memory.filePath;
                return (
                    <section key={memory.memoryId} id={fileName} className={'border-b border-border last:border-0'}>
                        <MemoryView memory={memory}/>
                    </section>
                );
            })}
        </div>
    );
}

export default MemoryPage;
