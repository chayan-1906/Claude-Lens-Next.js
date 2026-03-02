import {notFound} from "next/navigation";
import type {ISessionPageProps} from "@/types/components";
import {getSession} from "@/actions/sessionss.actions";
import type {IGetSessionResponse} from "@/types/session";
import {SessionView} from "@/components/SessionView";

async function SessionPage({params}: ISessionPageProps) {
    const {sessionId} = await params;
    const {success, session, messages, error}: IGetSessionResponse = await getSession({sessionId});

    if (!success || !session || !messages) {
        if (error?.includes('Invalid sessionId') || error?.includes('No session found')) {
            notFound();
        }

        return (
            <div className={'flex items-center justify-center h-full'}>
                <p className={'text-sm text-error'}>{error || 'Failed to load session!'}</p>
            </div>
        );
    }

    return (
        <SessionView session={session} messages={messages}/>
    );
}

export default SessionPage;
