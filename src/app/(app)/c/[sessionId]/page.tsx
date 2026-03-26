import {notFound} from "next/navigation";
import {getSession} from "@/actions/session.actions";
import {getSetupStatus} from "@/actions/setup.actions";
import type {IGetSessionResponse} from "@/types/session";
import type {ISessionPageProps} from "@/types/components";
import type {IGetSetupStatusResponse} from "@/types/setup";
import {ChatSessionView} from "@/components/ChatSessionView";

async function SessionPage({params}: ISessionPageProps) {
    const {sessionId} = await params;
    const isNewChat: boolean = sessionId === 'new';

    const {r2Configured}: IGetSetupStatusResponse = await getSetupStatus();

    if (isNewChat) {
        const instanceKey: string = crypto.randomUUID();
        return <ChatSessionView key={instanceKey} isNewChat={true} r2Configured={r2Configured ?? false}/>;
    }

    const {success, session, messages, localJsonlAvailable, error}: IGetSessionResponse = await getSession({sessionId});

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
        <ChatSessionView isNewChat={false} session={session} historicalMessages={messages} r2Configured={r2Configured ?? false} localJsonlAvailable={localJsonlAvailable ?? false}/>
    );
}

export default SessionPage;
