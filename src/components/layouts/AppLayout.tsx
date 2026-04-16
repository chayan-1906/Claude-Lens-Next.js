"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {HiOutlineCog, HiOutlineMenuAlt2, HiOutlineX} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {assets} from "@/utils/assets";
import {routes} from "@/utils/routes";
import {Button} from "@/components/ui/Button";
import {SyncButton} from "@/components/SyncButton";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import type {IAppLayoutProps} from "@/types/components";

function AppLayout({children, sidebar}: IAppLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(false);
    const [isMobile, setIsMobile] = React.useState<boolean>(false);

    const toggleSidebar = React.useCallback(() => setSidebarOpen((prev: boolean) => !prev), []);

    React.useEffect(() => {
        function handleResize(): void {
            const isMobileView: boolean = window.innerWidth < 768;
            setIsMobile(isMobileView);
            setSidebarOpen(!isMobileView);
        }

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className={'flex h-dvh bg-background text-text'}>
            {/* Mobile overlay */}
            {(sidebarOpen && isMobile) && (
                <div className={'fixed inset-0 bg-black/50 z-40'} onClick={() => setSidebarOpen(false)}/>
            )}

            {/* Sidebar */}
            <aside className={cn('fixed md:static inset-y-0 left-0 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-200 z-50 md:z-auto', isMobile && !sidebarOpen && '-translate-x-full')}>
                {/* Sidebar brand header */}
                <div className={'flex items-center justify-between px-4 py-4 border-b border-border shrink-0'}>
                    <Link href={routes.homePath} className={'flex items-center gap-2.5 min-w-0 group'}>
                        <div className={'relative size-8 rounded-xl overflow-hidden shrink-0 ring-1 ring-border group-hover:ring-primary/30 transition-all'}>
                            <Image src={assets.logo} alt={'Claude Lens'} fill unoptimized className={'object-cover'}/>
                        </div>
                        <div className={'min-w-0'}>
                            <p className={'text-sm font-bold text-text leading-none tracking-tight'}>Claude Lens</p>
                            <p className={'text-[10px] text-text-muted mt-0.5 leading-none'}>Session Browser</p>
                        </div>
                    </Link>
                    <Button variant={'ghost'} size={'icon'} onClick={toggleSidebar} className={'md:hidden size-8 shrink-0 text-text-muted'} title={'Close sidebar'}>
                        <HiOutlineX className={'size-4'}/>
                    </Button>
                </div>

                {/* Sidebar Scrollable Content */}
                <div className={'flex-1 overflow-y-auto p-3'}>
                    {sidebar}
                </div>
            </aside>

            {/* Main Content */}
            <main className={'flex-1 flex flex-col overflow-hidden min-w-0'}>
                {/* Top Header Bar */}
                <header className={'flex items-center gap-3 px-4 py-3 border-b border-border bg-surface shrink-0'}>
                    {/* Mobile: hamburger + brand */}
                    <div className={'flex items-center gap-2 md:hidden'}>
                        <Button variant={'ghost'} size={'icon'} onClick={toggleSidebar} className={'size-8'} title={'Open sidebar'}>
                            <HiOutlineMenuAlt2 className={'size-4'}/>
                        </Button>
                        <Link href={routes.homePath} className={'flex items-center gap-2'}>
                            <div className={'relative size-6 rounded-lg overflow-hidden shrink-0'}>
                                <Image src={assets.logo} alt={'Claude Lens'} fill unoptimized className={'object-cover'}/>
                            </div>
                            <span className={'text-sm font-bold text-text'}>Claude Lens</span>
                        </Link>
                    </div>

                    <div className={'flex-1'}/>

                    {/* Toolbar */}
                    <div className={'flex items-center gap-1'}>
                        <SyncButton/>
                        <Link href={routes.setupPath} title={'Settings'}
                              className={'inline-flex items-center justify-center size-8 rounded-md text-text-muted hover:text-text hover:bg-border active:bg-border/70 transition-all duration-150'}>
                            <HiOutlineCog className={'size-4'}/>
                        </Link>
                        <ThemeSwitcher/>
                    </div>
                </header>

                {/* Page Content */}
                <div className={'flex-1 overflow-y-auto'}>
                    {children}
                </div>
            </main>
        </div>
    );
}

export {AppLayout};
