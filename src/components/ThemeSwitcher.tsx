"use client";

import React from "react";
import {cn} from "@/utils/cn";
import {Button} from "@/components/ui/Button";
import {useTheme} from "@/components/ThemeProvider";
import type {IThemeSchemePreview} from "@/types/theme";
import {EThemeMode, EThemeScheme, THEME_SCHEME_LABELS, THEME_SCHEME_PREVIEWS} from "@/types/theme";

const schemes: EThemeScheme[] = Object.values(EThemeScheme);
const previewKeys: (keyof IThemeSchemePreview)[] = ['primary', 'secondary', 'accent', 'text', 'background'];
const modes: { value: EThemeMode; label: string; icon: string }[] = [
    {value: EThemeMode.LIGHT, label: 'Light', icon: '\u2600'},
    {value: EThemeMode.DARK, label: 'Dark', icon: '\u263E'},
    {value: EThemeMode.SYSTEM, label: 'System', icon: '\u25D0'},
];

function ThemeSwitcher() {
    const {scheme, mode, setScheme, setMode} = useTheme();
    const [isOpen, setIsOpen] = React.useState<boolean>(false);
    const popoverRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent): void {
            if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={'relative'} ref={popoverRef}>
            {/* Trigger button */}
            <Button variant={'ghost'} size={'icon'} onClick={() => setIsOpen((prev: boolean) => !prev)} className={'size-9 text-text-muted hover:text-text'} title={'Theme'}>
                <svg xmlns={'http://www.w3.org/2000/svg'} width={18} height={18} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={2} strokeLinecap={'round'}
                     strokeLinejoin={'round'}>
                    <circle cx={13.5} cy={6.5} r={.5} fill={'currentColor'}/>
                    <circle cx={17.5} cy={10.5} r={.5} fill={'currentColor'}/>
                    <circle cx={8.5} cy={7.5} r={.5} fill={'currentColor'}/>
                    <circle cx={6.5} cy={12.5} r={.5} fill={'currentColor'}/>
                    <path
                        d={'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z'}/>
                </svg>
            </Button>

            {/* Popover panel */}
            {isOpen && (
                <div className={'absolute bottom-full left-0 mb-2 rounded-xl border border-border bg-surface shadow-lg p-4 z-50'}>
                    {/* Scheme rows — 5 colors per scheme */}
                    <p className={'text-xs font-medium text-text-muted mb-3'}>{'Color Scheme'}</p>
                    <div className={'flex flex-col gap-1 mb-4'}>
                        {schemes.map((s: EThemeScheme) => {
                            const preview: IThemeSchemePreview = THEME_SCHEME_PREVIEWS[s];
                            const isActive: boolean = scheme === s;

                            return (
                                <Button key={s} variant={'ghost'} size={'sm'} onClick={() => setScheme(s)} title={THEME_SCHEME_LABELS[s]}
                                        className={cn(
                                            'flex items-center justify-start gap-3 w-full h-auto px-3 py-2 rounded-lg',
                                            isActive ? 'bg-border ring-1 ring-primary' : '',
                                        )}
                                >
                                    <div className={'flex items-center gap-1.5'}>
                                        {previewKeys.map((key: keyof IThemeSchemePreview) => (
                                            <span key={key} className={'size-5 rounded-full border border-border/50'} style={{backgroundColor: preview[key]}}/>
                                        ))}
                                    </div>
                                    <span className={cn('text-xs whitespace-nowrap', isActive ? 'text-text font-medium' : 'text-text-muted')}>
                                        {THEME_SCHEME_LABELS[s]}
                                    </span>
                                </Button>
                            );
                        })}
                    </div>

                    {/* Mode segmented control */}
                    <p className={'text-xs font-medium text-text-muted mb-2'}>{'Mode'}</p>
                    <div className={'flex rounded-lg border border-border overflow-hidden'}>
                        {modes.map((m: { value: EThemeMode; label: string; icon: string }) => (
                            <Button key={m.value} variant={'ghost'} size={'sm'} onClick={() => setMode(m.value)}
                                    className={cn(
                                        'flex-1 h-auto rounded-none px-2 py-1.5 text-xs',
                                        mode === m.value ? 'bg-primary text-background font-medium hover:bg-primary' : 'text-text-muted',
                                    )}
                            >
                                <span>{m.icon}</span>
                                <span>{m.label}</span>
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ThemeSwitcher;