"use client";

import React from "react";
import {useTheme} from "@/components/ThemeProvider";
import {EThemeScheme, EThemeMode, THEME_SCHEME_LABELS, THEME_SCHEME_COLORS} from "@/types/theme";

const schemes: EThemeScheme[] = Object.values(EThemeScheme);
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
            <button
                type={'button'}
                onClick={() => setIsOpen((prev: boolean) => !prev)}
                className={'flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-surface text-text-muted hover:text-text hover:bg-background transition-colors'}
                title={'Theme'}
            >
                <svg xmlns={'http://www.w3.org/2000/svg'} width={18} height={18} viewBox={'0 0 24 24'} fill={'none'} stroke={'currentColor'} strokeWidth={2} strokeLinecap={'round'} strokeLinejoin={'round'}>
                    <circle cx={13.5} cy={6.5} r={.5} fill={'currentColor'} />
                    <circle cx={17.5} cy={10.5} r={.5} fill={'currentColor'} />
                    <circle cx={8.5} cy={7.5} r={.5} fill={'currentColor'} />
                    <circle cx={6.5} cy={12.5} r={.5} fill={'currentColor'} />
                    <path d={'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z'} />
                </svg>
            </button>

            {/* Popover panel */}
            {isOpen && (
                <div className={'absolute bottom-full left-0 mb-2 w-56 rounded-xl border border-border bg-surface shadow-lg p-4 z-50'}>
                    {/* Scheme swatches */}
                    <p className={'text-xs font-medium text-text-muted mb-2'}>{'Color Scheme'}</p>
                    <div className={'flex items-center gap-2 mb-4'}>
                        {schemes.map((s: EThemeScheme) => (
                            <button
                                key={s}
                                type={'button'}
                                onClick={() => setScheme(s)}
                                title={THEME_SCHEME_LABELS[s]}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${scheme === s ? 'border-text scale-110' : 'border-transparent hover:scale-105'}`}
                                style={{backgroundColor: THEME_SCHEME_COLORS[s]}}
                            />
                        ))}
                    </div>

                    {/* Mode segmented control */}
                    <p className={'text-xs font-medium text-text-muted mb-2'}>{'Mode'}</p>
                    <div className={'flex rounded-lg border border-border overflow-hidden'}>
                        {modes.map((m: { value: EThemeMode; label: string; icon: string }) => (
                            <button
                                key={m.value}
                                type={'button'}
                                onClick={() => setMode(m.value)}
                                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs transition-colors ${mode === m.value ? 'bg-primary text-background font-medium' : 'bg-surface text-text-muted hover:text-text'}`}
                            >
                                <span>{m.icon}</span>
                                <span>{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ThemeSwitcher;
