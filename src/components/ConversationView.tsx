import type {IMessage} from "@/types/message";
import {MessageBubble} from "@/components/MessageBubble";
import {ScrollToBottom} from "@/components/ScrollToBottom";
import type {IConversationViewProps} from "@/types/components";

function ConversationView({conversation, messages}: IConversationViewProps) {
    return (
        <div className={'flex flex-col h-full'}>
            {/* Conversation header */}
            <div className={'px-6 py-3 border-b border-border shrink-0'}>
                <h1 className={'text-sm font-semibold truncate'}>{conversation.title}</h1>
                <p className={'text-xs text-text-muted mt-0.5'}>
                    {conversation.aiModel && (
                        <span>{conversation.aiModel}</span>
                    )}
                    {(conversation.aiModel && conversation.gitBranch) && (
                        <span>{' · '}</span>
                    )}
                    {conversation.gitBranch && (
                        <span>{conversation.gitBranch}</span>
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

export {ConversationView};
