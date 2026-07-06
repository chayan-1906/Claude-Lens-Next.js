import Link from "next/link";
import Image from "next/image";
import type {Metadata} from "next";
import {HiOutlineChatAlt2, HiOutlinePlus} from "react-icons/hi";
import {routes} from "@/utils/routes";
import {assets} from "@/utils/assets";

export const metadata: Metadata = {
    title: 'Projects | Claude Lens',
};

function HomePage() {
    return (
        <div className={'flex flex-col items-center justify-center h-full gap-6 px-6 text-center'}>
            {/* Logo */}
            <div className={'relative size-20 rounded-2xl overflow-hidden ring-1 ring-border shadow-lg shrink-0'}>
                <Image src={assets.logo} alt={'Claude Lens'} fill unoptimized className={'object-cover'}/>
            </div>

            {/* Brand + tagline */}
            <div className={'space-y-1.5'}>
                <h1 className={'text-2xl font-bold text-text tracking-tight'}>Claude Lens</h1>
                <p className={'text-sm text-text-muted'}>Browse and chat with your Claude Code sessions from any device</p>
            </div>

            {/* CTA */}
            <Link href={routes.newSessionPath}
                  className={'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-dark-primary active:scale-95 transition-all duration-150 shadow-sm'}>
                <HiOutlinePlus className={'size-4'}/>
                New Chat
            </Link>

            {/* Hint */}
            <p className={'text-xs text-text-muted flex items-center gap-1.5'}>
                <HiOutlineChatAlt2 className={'size-3.5 shrink-0'}/>
                or select a session from the sidebar
            </p>
        </div>
    );
}

export default HomePage;
