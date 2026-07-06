import Link from "next/link";
import {routes} from "@/utils/routes";

function RootNotFound() {
    return (
        <div className={'flex flex-col items-center justify-center min-h-dvh gap-4 text-center px-6'}>
            <div className={'flex flex-col items-center gap-1'}>
                <h1 className={'text-2xl font-bold text-primary tracking-tight'}>Claude Lens</h1>
                <p className={'text-xs text-text-muted'}>Browse Claude Code sessions from any device</p>
            </div>

            <div className={'w-12 border-t border-border'}/>

            <div className={'flex flex-col items-center gap-2'}>
                <span className={'text-6xl font-bold text-text-muted/40'}>404</span>
                <h2 className={'text-base font-semibold text-text'}>Page not found</h2>
                <p className={'text-sm text-text-muted max-w-sm'}>
                    The page you are looking for doesn&#39;t exist or has been moved!
                </p>
            </div>

            <Link href={routes.homePath} className={'mt-2 px-5 py-2 rounded-lg bg-primary text-sm font-medium text-white hover:opacity-90 transition-opacity'}>
                Go to home
            </Link>
        </div>
    );
}

export default RootNotFound;
