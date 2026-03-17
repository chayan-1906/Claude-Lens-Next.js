function TaskLoading() {
    return (
        <div className={'flex flex-col h-full'}>
            {/* Header skeleton */}
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <div className={'flex items-center justify-between'}>
                    <div className={'flex items-center gap-2'}>
                        <div className={'h-3.5 w-12 bg-border/50 animate-pulse rounded'}/>
                        <div className={'h-4 w-16 bg-border/50 animate-pulse rounded-full'}/>
                    </div>
                    <div className={'flex items-center gap-1'}>
                        <div className={'size-7 bg-border/50 animate-pulse rounded'}/>
                        <div className={'size-7 bg-border/50 animate-pulse rounded'}/>
                    </div>
                </div>
                <div className={'h-4 w-64 bg-border/50 animate-pulse rounded mt-1.5'}/>
                <div className={'h-3 w-24 bg-border/50 animate-pulse rounded mt-1.5'}/>
            </div>

            {/* Body skeleton */}
            <div className={'flex-1 overflow-y-auto px-6 py-4'}>
                <div className={'max-w-2xl mx-auto flex flex-col gap-5'}>
                    {/* Description section */}
                    <div>
                        <div className={'h-3 w-20 bg-border/50 animate-pulse rounded mb-2'}/>
                        <div className={'flex flex-col gap-2'}>
                            <div className={'h-3.5 w-full bg-border/50 animate-pulse rounded'}/>
                            <div className={'h-3.5 w-5/6 bg-border/50 animate-pulse rounded'}/>
                            <div className={'h-3.5 w-4/6 bg-border/50 animate-pulse rounded'}/>
                        </div>
                    </div>

                    {/* Active form section */}
                    <div>
                        <div className={'h-3 w-24 bg-border/50 animate-pulse rounded mb-2'}/>
                        <div className={'h-3.5 w-48 bg-border/50 animate-pulse rounded'}/>
                    </div>

                    {/* Dependencies section */}
                    <div>
                        <div className={'h-3 w-28 bg-border/50 animate-pulse rounded mb-2'}/>
                        <div className={'flex items-center gap-2'}>
                            <div className={'h-5 w-10 bg-border/50 animate-pulse rounded'}/>
                            <div className={'h-5 w-10 bg-border/50 animate-pulse rounded'}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TaskLoading;
