import type {IMessage} from "@/types/message";
import {MessageBubble} from "@/components/MessageBubble";
import type {ISessionViewProps} from "@/types/components";
import {ScrollToBottom} from "@/components/ScrollToBottom";

function SessionView({session, messages}: ISessionViewProps) {
    return (
        <div className={'flex flex-col h-full'}>
            {/* session header */}
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <h1 className={'text-sm font-semibold truncate'}>{session.title}</h1>
                <p className={'text-xs text-text-muted mt-0.5'}>
                    {session.aiModel && (
                        <span>{session.aiModel}</span>
                    )}
                    {(session.aiModel && session.gitBranch) && (
                        <span>{' · '}</span>
                    )}
                    {session.gitBranch && (
                        <span>{session.gitBranch}</span>
                    )}
                </p>
            </div>

            {/* Messages */}
            <div className={'flex-1 overflow-y-auto px-6 py-4'}>
                <div className={'max-w-3xl mx-auto flex flex-col gap-4'}>
                    {messages.map((message: IMessage) => (
                        <MessageBubble key={message.uuid} message={message}/>
                    ))}
                    <ScrollToBottom/>
                </div>
            </div>
        </div>
    );
}

export {SessionView};
