import ThemeSwitcher from "@/components/ThemeSwitcher";

function Home() {
    return (
        <div className={'flex flex-col items-center justify-center h-dvh gap-6'}>
            <h1 className={'text-2xl font-semibold'}>{'Theme Test'}</h1>

            <div className={'grid grid-cols-2 gap-3 text-sm'}>
                <div className={'px-4 py-2 rounded-lg bg-surface border border-border'}>{'Surface'}</div>
                <div className={'px-4 py-2 rounded-lg bg-user-bubble'}>{'User Bubble'}</div>
                <div className={'px-4 py-2 rounded-lg bg-assistant-bubble border border-border'}>{'Assistant Bubble'}</div>
                <div className={'px-4 py-2 rounded-lg bg-code-bg border border-code-border font-mono'}>{'Code Block'}</div>
            </div>

            <div className={'flex items-center gap-3 text-sm'}>
                <span className={'text-primary'}>{'Primary'}</span>
                <span className={'text-secondary'}>{'Secondary'}</span>
                <span className={'text-accent'}>{'Accent'}</span>
                <span className={'text-success'}>{'Success'}</span>
                <span className={'text-warning'}>{'Warning'}</span>
                <span className={'text-error'}>{'Error'}</span>
                <span className={'text-text-muted'}>{'Muted'}</span>
            </div>

            <ThemeSwitcher />
        </div>
    );
}

export default Home;
