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

export interface IThemeSchemePreview {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
}

export const THEME_SCHEME_PREVIEWS: Record<EThemeScheme, IThemeSchemePreview> = {
    [EThemeScheme.ARCTIC_STEEL]: {primary: '#2563EB', secondary: '#64748B', accent: '#0EA5E9', text: '#0F172A', background: '#F8FAFC'},
    [EThemeScheme.WARM_STONE]: {primary: '#B45309', secondary: '#78716C', accent: '#D97706', text: '#1C1917', background: '#FAF9F6'},
    [EThemeScheme.EVERGREEN]: {primary: '#0D7377', secondary: '#6B7F7A', accent: '#0D9488', text: '#0C1B19', background: '#F6FAF9'},
    [EThemeScheme.DUSK]: {primary: '#6D28D9', secondary: '#6B7280', accent: '#E11D48', text: '#111827', background: '#FAF9FC'},
    [EThemeScheme.CARBON]: {primary: '#18181B', secondary: '#71717A', accent: '#F97316', text: '#09090B', background: '#FAFAFA'},
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
