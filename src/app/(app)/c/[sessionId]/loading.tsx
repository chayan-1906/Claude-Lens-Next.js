function SessionLoading() {
    return (
        <div className={'flex flex-col h-full'}>
            {/* Header skeleton */}
            <div className={'flex px-6 py-3 items-center justify-between border-b border-border shrink-0'}>
                <div className={'flex flex-col gap-1.5'}>
                    <div className={'h-4 w-48 bg-border/50 animate-pulse rounded'}/>
                    <div className={'h-3 w-28 bg-border/50 animate-pulse rounded'}/>
                </div>
                <div className={'flex items-center gap-2'}>
                    <div className={'size-7 bg-border/80 animate-pulse rounded'}/>
                    <div className={'size-7 bg-border/50 animate-pulse rounded'}/>
                    <div className={'size-2.5 bg-border/50 animate-pulse rounded-full'}/>
                </div>
            </div>

            {/* Messages skeleton */}
            <div className={'flex-1 overflow-y-auto px-6 py-4'}>
                <div className={'max-w-3xl mx-auto flex flex-col gap-4'}>
                    {/* User bubble (right) */}
                    <div className={'flex flex-col items-end'}>
                        <div className={'max-w-[85%] w-64 h-10 bg-border/50 animate-pulse rounded-2xl'}/>
                    </div>

                    {/* Assistant bubble (left) */}
                    <div className={'flex flex-col items-start'}>
                        <div className={'max-w-[85%] w-80 h-24 bg-border/50 animate-pulse rounded-2xl'}/>
                    </div>

                    {/* User bubble (right) */}
                    <div className={'flex flex-col items-end'}>
                        <div className={'max-w-[85%] w-52 h-10 bg-border/50 animate-pulse rounded-2xl'}/>
                    </div>

                    {/* Assistant bubble (left) */}
                    <div className={'flex flex-col items-start'}>
                        <div className={'max-w-[85%] w-72 h-32 bg-border/50 animate-pulse rounded-2xl'}/>
                    </div>

                    {/* User bubble (right) */}
                    <div className={'flex flex-col items-end'}>
                        <div className={'max-w-[85%] w-44 h-10 bg-border/50 animate-pulse rounded-2xl'}/>
                    </div>

                    {/* Assistant bubble (left) */}
                    <div className={'flex flex-col items-start'}>
                        <div className={'max-w-[85%] w-96 h-20 bg-border/50 animate-pulse rounded-2xl'}/>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SessionLoading;
