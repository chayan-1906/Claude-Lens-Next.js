import {notFound} from "next/navigation";
import {MemoryView} from "@/components/MemoryView";
import {getMemory} from "@/actions/memory.actions";
import type {IGetMemoryResponse} from "@/types/memory";
import type {IMemoryPageProps} from "@/types/components";

async function MemoryPage({params}: IMemoryPageProps) {
    const {projectDir} = await params;
    const {success, memory, error}: IGetMemoryResponse = await getMemory({projectDir});

    if (!success || !memory) {
        if (error?.includes('Invalid projectDir') || error?.includes('No memory found')) {
            notFound();
        }

        return (
            <div className={'flex items-center justify-center h-full'}>
                <p className={'text-sm text-error'}>{error || 'Failed to load memory!'}</p>
            </div>
        );
    }

    return (
        <MemoryView memory={memory}/>
    );
}

export default MemoryPage;
