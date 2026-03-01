import {HiOutlineChatAlt2} from "react-icons/hi";

function HomePage() {
    return (
        <div className={'flex flex-col items-center justify-center h-full gap-4 text-text-muted'}>
            <HiOutlineChatAlt2 className={'size-12 opacity-30'}/>
            <p className={'text-sm'}>Select a conversation from the sidebar</p>
        </div>
    );
}

export default HomePage;
