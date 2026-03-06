"use client";

import React from "react";
import {HiOutlineMenuAlt2, HiOutlineX} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import {SyncButton} from "@/components/SyncButton";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import type {IAppLayoutProps} from "@/types/components";

function AppLayout({children, sidebar, sidebarTitle = 'Sessions'}: IAppLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true);
    const [isMobile, setIsMobile] = React.useState<boolean>(false);

    const toggleSidebar = (): void => setSidebarOpen((prev: boolean) => !prev);

    React.useEffect(() => {
        function handleResize(): void {
            const isMobileView: boolean = window.innerWidth < 768;
            setIsMobile(isMobileView);
            if (!isMobileView) {
                setSidebarOpen(true);
            }
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
            <aside
                className={cn('fixed md:static inset-y-0 left-0 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-200 z-50', isMobile && !sidebarOpen && '-translate-x-full')}>
                {/* Sidebar Header */}
                <div className={'flex items-center justify-between gap-3 px-4 py-4 border-b border-border shrink-0'}>
                    <h2 className={'text-sm font-semibold text-text-secondary'}>{sidebarTitle}</h2>
                    <Button variant={'ghost'} size={'icon'} onClick={toggleSidebar} className={'md:hidden size-8'} title={'Close sidebar'}>
                        <HiOutlineX className={'size-4'}/>
                    </Button>
                </div>

                {/* Sidebar Scrollable Content */}
                <div className={'flex-1 overflow-y-auto p-3'}>
                    {sidebar}
                </div>
            </aside>

            {/* Main Content */}
            <main className={'flex-1 flex flex-col overflow-hidden'}>
                {/* Top Header Bar */}
                <header className={'flex items-center justify-between gap-4 px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-sm shrink-0'}>
                    {/* Hamburger — only visible on mobile */}
                    <Button variant={'ghost'} size={'icon'} onClick={toggleSidebar} className={'md:hidden size-8'} title={'Open sidebar'}>
                        <HiOutlineMenuAlt2 className={'size-4'}/>
                    </Button>

                    <div className={'flex-1'}/>

                    <SyncButton/>
                    <ThemeSwitcher/>
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
