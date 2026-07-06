function MemoryLoading() {
    return (
        <div>
            {/* Page header skeleton */}
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <div className={'flex items-center gap-1'}>
                    <div className={'h-4 w-20 bg-border/50 animate-pulse rounded'}/>
                    <div className={'ml-auto size-7 bg-border/50 animate-pulse rounded'}/>
                </div>
                <div className={'h-3 w-48 bg-border/50 animate-pulse rounded mt-1'}/>
            </div>

            {/* Memory file sections */}
            {[1, 2, 3].map((i: number) => (
                <section key={i} className={'border-b border-border last:border-0'}>
                    {/* File header */}
                    <div className={'px-6 py-3 border-b border-border'}>
                        <div className={'h-4 w-32 bg-border/50 animate-pulse rounded'}/>
                    </div>

                    {/* File content */}
                    <div className={'px-6 py-4'}>
                        <div className={'max-w-3xl mx-auto flex flex-col gap-2'}>
                            <div className={'h-3.5 w-full bg-border/50 animate-pulse rounded'}/>
                            <div className={'h-3.5 w-5/6 bg-border/50 animate-pulse rounded'}/>
                            <div className={'h-3.5 w-3/4 bg-border/50 animate-pulse rounded'}/>
                            <div className={'h-3.5 w-2/3 bg-border/50 animate-pulse rounded'}/>
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}

export default MemoryLoading;
