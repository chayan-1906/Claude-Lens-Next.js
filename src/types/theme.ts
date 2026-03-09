import React from "react";

/** ------------- Constants and Type Aliases ------------- */

export enum EThemeScheme {
    ARCTIC_STEEL = 'arctic-steel',
    WARM_STONE = 'warm-stone',
    EVERGREEN = 'evergreen',
    DUSK = 'dusk',
    CARBON = 'carbon',
    ROSEWOOD = 'rosewood',
    OCEAN = 'ocean',
    COPPER = 'copper',
    SAGE = 'sage',
    NOIR = 'noir',
    HORIZON = 'horizon',
    COBALT = 'cobalt',
    ESPRESSO = 'espresso',
    EMBER = 'ember',
    MINT = 'mint',
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
    [EThemeScheme.ROSEWOOD]: 'Rosewood',
    [EThemeScheme.OCEAN]: 'Ocean',
    [EThemeScheme.COPPER]: 'Copper',
    [EThemeScheme.SAGE]: 'Sage',
    [EThemeScheme.NOIR]: 'Noir',
    [EThemeScheme.HORIZON]: 'Horizon',
    [EThemeScheme.COBALT]: 'Cobalt',
    [EThemeScheme.ESPRESSO]: 'Espresso',
    [EThemeScheme.EMBER]: 'Ember',
    [EThemeScheme.MINT]: 'Mint',
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
    [EThemeScheme.ROSEWOOD]: {primary: '#BE185D', secondary: '#78716C', accent: '#E11D48', text: '#1C1017', background: '#FBF8F9'},
    [EThemeScheme.OCEAN]: {primary: '#0369A1', secondary: '#64748B', accent: '#06B6D4', text: '#082F49', background: '#F0F9FF'},
    [EThemeScheme.COPPER]: {primary: '#C2410C', secondary: '#78716C', accent: '#EA580C', text: '#1A1210', background: '#FEFBF6'},
    [EThemeScheme.SAGE]: {primary: '#4D7C0F', secondary: '#717868', accent: '#CA8A04', text: '#1A1D16', background: '#F9FAF6'},
    [EThemeScheme.NOIR]: {primary: '#92700A', secondary: '#64605A', accent: '#B8860B', text: '#1A1814', background: '#FCFBF8'},
    [EThemeScheme.HORIZON]: {primary: '#C84B2A', secondary: '#7C7270', accent: '#7C3AED', text: '#1F1412', background: '#FFFBF7'},
    [EThemeScheme.COBALT]: {primary: '#1E40AF', secondary: '#6B7280', accent: '#CA8A04', text: '#111827', background: '#F7F8FC'},
    [EThemeScheme.ESPRESSO]: {primary: '#6B4226', secondary: '#7C7068', accent: '#B8860B', text: '#2C1810', background: '#FBF8F4'},
    [EThemeScheme.EMBER]: {primary: '#991B1B', secondary: '#78706C', accent: '#B8860B', text: '#1C1210', background: '#FDF8F6'},
    [EThemeScheme.MINT]: {primary: '#0D9267', secondary: '#6B7C74', accent: '#E8566C', text: '#0C1A14', background: '#F4FCF8'},
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
