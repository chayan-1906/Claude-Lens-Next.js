import {notFound} from "next/navigation";
import type {ISessionPageProps} from "@/types/components";
import {getSession} from "@/actions/conversations.actions";
import type {IGetSessionResponse} from "@/types/conversation";
import {ConversationView} from "@/components/ConversationView";

async function SessionPage({params}: ISessionPageProps) {
    const {sessionId} = await params;
    const {success, conversation, messages, error}: IGetSessionResponse = await getSession({sessionId});

    if (!success || !conversation || !messages) {
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
        <ConversationView conversation={conversation} messages={messages}/>
    );
}

export default SessionPage;
