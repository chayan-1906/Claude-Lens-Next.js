import {notFound} from "next/navigation";
import {getSession} from "@/actions/session.actions";
import type {IGetSessionResponse} from "@/types/session";
import type {ISessionPageProps} from "@/types/components";
import {ChatSessionView} from "@/components/ChatSessionView";

async function SessionPage({params}: ISessionPageProps) {
    const {sessionId} = await params;
    const isNewChat: boolean = sessionId === 'new';

    if (isNewChat) {
        return <ChatSessionView isNewChat={true}/>;
    }

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
        <ChatSessionView isNewChat={false} session={session} historicalMessages={messages}/>
    );
}

export default SessionPage;
