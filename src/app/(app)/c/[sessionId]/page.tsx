import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {getSession} from "@/actions/session.actions";
import {getSetupStatus} from "@/actions/setup.actions";
import type {IGetSessionResponse} from "@/types/session";
import type {ISessionPageProps} from "@/types/components";
import type {IGetSetupStatusResponse} from "@/types/setup";
import {ChatSessionView} from "@/components/ChatSessionView";
import {SESSION_MESSAGES_PAGE_SIZE} from "@/utils/pagination";

export async function generateMetadata({params}: ISessionPageProps): Promise<Metadata> {
    const {sessionId} = await params;
    if (sessionId === 'new') {
        return {title: 'New Chat | Claude Lens'};
    }
    const {session}: IGetSessionResponse = await getSession({sessionId, limit: SESSION_MESSAGES_PAGE_SIZE});
    return {title: `${session?.title ?? 'Session'} | Claude Lens`};
}

async function SessionPage({params}: ISessionPageProps) {
    const {sessionId} = await params;
    const isNewChat: boolean = sessionId === 'new';

    const {r2Configured, groqConfigured}: IGetSetupStatusResponse = await getSetupStatus();

    if (isNewChat) {
        const instanceKey: string = crypto.randomUUID();
        return (
            <ChatSessionView key={instanceKey} isNewChat={true} r2Configured={r2Configured ?? false} groqConfigured={groqConfigured ?? false}/>
        );
    }

    const {success, session, messages, pagination, localJsonlAvailable, error}: IGetSessionResponse = await getSession({
        sessionId,
        limit: SESSION_MESSAGES_PAGE_SIZE,
    });

    if (!success || !session || !messages || !pagination) {
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
        <ChatSessionView
            isNewChat={false}
            session={session}
            historicalMessages={messages}
            initialPagination={pagination}
            r2Configured={r2Configured ?? false}
            groqConfigured={groqConfigured ?? false}
            localJsonlAvailable={localJsonlAvailable ?? false}
        />
    );
}

export default SessionPage;
