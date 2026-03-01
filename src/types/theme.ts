/** ------------- Constants and Type Aliases ------------- */
import React from "react";

export enum EThemeScheme {
    ARCTIC_STEEL = 'arctic-steel',
    WARM_STONE = 'warm-stone',
    EVERGREEN = 'evergreen',
    DUSK = 'dusk',
    CARBON = 'carbon',
}

export enum EThemeMode {
    LIGHT = 'light',
    DARK = 'dark',
    SYSTEM = 'system',
}

export const DEFAULT_THEME_SCHEME: EThemeScheme = EThemeScheme.CARBON;
export const DEFAULT_THEME_MODE: EThemeMode = EThemeMode.SYSTEM;

export const THEME_SCHEME_COOKIE: string = 'theme-scheme';
export const THEME_MODE_COOKIE: string = 'theme-mode';

export const THEME_SCHEME_LABELS: Record<EThemeScheme, string> = {
    [EThemeScheme.ARCTIC_STEEL]: 'Arctic Steel',
    [EThemeScheme.WARM_STONE]: 'Warm Stone',
    [EThemeScheme.EVERGREEN]: 'Evergreen',
    [EThemeScheme.DUSK]: 'Dusk',
    [EThemeScheme.CARBON]: 'Carbon',
};

export const THEME_SCHEME_COLORS: Record<EThemeScheme, string> = {
    [EThemeScheme.ARCTIC_STEEL]: '#2563EB',
    [EThemeScheme.WARM_STONE]: '#B45309',
    [EThemeScheme.EVERGREEN]: '#0D7377',
    [EThemeScheme.DUSK]: '#6D28D9',
    [EThemeScheme.CARBON]: '#71717A',
};

export interface IThemeContext {
    scheme: EThemeScheme;
    mode: EThemeMode;
    setScheme: (scheme: EThemeScheme) => void;
    setMode: (mode: EThemeMode) => void;
}


/** ------------- API response types ------------- */


/** ------------- function params ------------- */

export interface IThemeProviderProps {
    children: React.ReactNode;
    initialScheme: EThemeScheme;
    initialMode: EThemeMode;
}
