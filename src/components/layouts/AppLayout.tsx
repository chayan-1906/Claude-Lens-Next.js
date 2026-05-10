"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {HiOutlineCog, HiOutlineMenuAlt2, HiOutlineSearch, HiOutlineTemplate, HiOutlineX} from "react-icons/hi";
import {cn} from "@/utils/cn";
import {assets} from "@/utils/assets";
import {routes} from "@/utils/routes";
import {Button} from "@/components/ui/Button";
import {SyncButton} from "@/components/SyncButton";
import {SearchModal} from "@/components/SearchModal";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import type {IAppLayoutProps} from "@/types/components";
import {useKeyboardShortcut} from "@/hooks/useKeyboardShortcut";

const SIDEBAR_MIN_WIDTH: number = 180;
const SIDEBAR_MAX_WIDTH: number = 480;
const SIDEBAR_DEFAULT_WIDTH: number = 256;
const SIDEBAR_STORAGE_KEY: string = 'claude-lens-sidebar-width';
const SIDEBAR_COLLAPSED_KEY: string = 'claude-lens-sidebar-collapsed';

function AppLayout({children, sidebar}: IAppLayoutProps) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(false);
    const [isMobile, setIsMobile] = React.useState<boolean>(false);
    const [sidebarWidth, setSidebarWidth] = React.useState<number>(SIDEBAR_DEFAULT_WIDTH);
    const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);
    const [isSearchOpen, setIsSearchOpen] = React.useState<boolean>(false);
    const asideRef = React.useRef<HTMLElement>(null);
    const sidebarWidthRef = React.useRef<number>(SIDEBAR_DEFAULT_WIDTH);
    const isResizingRef = React.useRef<boolean>(false);
    const dragStartXRef = React.useRef<number>(0);
    const dragStartWidthRef = React.useRef<number>(SIDEBAR_DEFAULT_WIDTH);

    const desktopSidebarStyle: React.CSSProperties = !isMobile
        ? {width: isCollapsed ? 0 : sidebarWidth, overflow: 'hidden', minWidth: 0}
        : {};

    const toggleSidebar = React.useCallback(() => setSidebarOpen((prev: boolean) => !prev), []);

    const handleToggleCollapse = React.useCallback((): void => {
        setIsCollapsed((prev: boolean) => {
            const next: boolean = !prev;
            localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
            return next;
        });
    }, []);

    /** Load persisted sidebar width + collapsed state */
    React.useEffect(() => {
        const savedWidth: string | null = localStorage.getItem(SIDEBAR_STORAGE_KEY);
        if (savedWidth) {
            const parsed: number = parseInt(savedWidth, 10);
            if (!isNaN(parsed)) {
                const clamped: number = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsed));
                setSidebarWidth(clamped);
                sidebarWidthRef.current = clamped;
            }
        }
        const savedCollapsed: string | null = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        if (savedCollapsed === 'true') setIsCollapsed(true);
    }, []);

    /** ⌥N → new session */
    useKeyboardShortcut({code: 'KeyN', alt: true}, () => {
        router.push(routes.newSessionPath);
    });

    /** ⌘K / Ctrl+K → toggle global search */
    useKeyboardShortcut({code: 'KeyK', mod: true}, () => {
        setIsSearchOpen((prev: boolean) => !prev);
    });

    /** ⌘\ / Ctrl+\ → toggle sidebar (drawer on mobile, collapse on desktop) */
    useKeyboardShortcut({code: 'Backslash', mod: true}, () => {
        if (isMobile) {
            toggleSidebar();
        } else {
            handleToggleCollapse();
        }
    });

    /** Sidebar resize — write directly to DOM during drag to avoid re-render lag */
    const handleResizeMouseDown = React.useCallback((e: React.MouseEvent): void => {
        if (isCollapsed) return;
        isResizingRef.current = true;
        dragStartXRef.current = e.clientX;
        dragStartWidthRef.current = sidebarWidthRef.current;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        // Disable CSS transition while dragging so it doesn't fight direct DOM updates
        if (asideRef.current) asideRef.current.style.transition = 'none';
        e.preventDefault();
    }, [isCollapsed]);

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

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent): void => {
            if (!isResizingRef.current || !asideRef.current) return;
            const newWidth: number = Math.min(
                SIDEBAR_MAX_WIDTH,
                Math.max(SIDEBAR_MIN_WIDTH, dragStartWidthRef.current + (e.clientX - dragStartXRef.current)),
            );
            sidebarWidthRef.current = newWidth;
            asideRef.current.style.width = `${newWidth}px`;
        };
        const handleMouseUp = (): void => {
            if (!isResizingRef.current) return;
            isResizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            if (asideRef.current) asideRef.current.style.transition = '';
            setSidebarWidth(sidebarWidthRef.current);
            localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidthRef.current));
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return (
        <div className={'flex h-dvh bg-background text-text'}>
            {/* Mobile overlay */}
            {(sidebarOpen && isMobile) && (
                <div className={'fixed inset-0 bg-black/50 z-40'} onClick={() => setSidebarOpen(false)}/>
            )}

            {/* Sidebar */}
            <aside
                ref={asideRef as React.RefObject<HTMLElement>}
                className={cn(
                    'fixed md:static inset-y-0 left-0 bg-surface border-r border-border flex flex-col z-50 md:z-auto',
                    'md:transition-[width] md:duration-200',
                    isMobile ? 'w-64 transition-transform duration-200' : '',
                    isMobile && !sidebarOpen && '-translate-x-full',
                )}
                style={desktopSidebarStyle}
            >
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

            {/* Resize handle — desktop only, hidden when collapsed */}
            {(!isMobile && !isCollapsed) && (
                <div
                    className={'hidden md:block w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/50 transition-colors'}
                    onMouseDown={handleResizeMouseDown}
                />
            )}

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

                    {/* Desktop: sidebar collapse toggle — always in a fixed position */}
                    <Button variant={'ghost'} size={'icon'} onClick={handleToggleCollapse}
                            className={'hidden md:flex size-8 text-text-muted'} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                        <HiOutlineTemplate className={'size-4'}/>
                    </Button>

                    <div className={'flex-1'}/>

                    {/* Toolbar */}
                    <div className={'flex items-center gap-1'}>
                        <Button variant={'ghost'} size={'icon'} onClick={() => setIsSearchOpen(true)} className={'size-8 text-text-muted'} title={'Search (Global)'}>
                            <HiOutlineSearch className={'size-4'}/>
                        </Button>
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

            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} defaultScope={'global'}/>
        </div>
    );
}

export {AppLayout};