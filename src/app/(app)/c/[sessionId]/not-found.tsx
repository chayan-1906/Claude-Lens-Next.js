import Link from "next/link";
import {routes} from "@/utils/routes";

function SessionNotFound() {
    return (
        <div className={'flex flex-col items-center justify-center h-full gap-3 text-center px-6'}>
            <span className={'text-5xl'}>🔍</span>
            <h2 className={'text-base font-semibold text-text'}>Session not found</h2>
            <p className={'text-sm text-text-muted'}>This session doesn&#39;t exist or may have been deleted!</p>
            <Link href={routes.homePath} className={'mt-2 text-sm text-primary hover:underline'}>
                ← Back to home
            </Link>
        </div>
    );
}

export default SessionNotFound;
