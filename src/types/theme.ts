import React from "react";

/** ------------- Constants and Type Aliases ------------- */

export enum EThemeScheme {
    DUSK = 'dusk',
    CARBON = 'carbon',
    OCEAN = 'ocean',
    COPPER = 'copper',
    NOIR = 'noir',
    COBALT = 'cobalt',
    ESPRESSO = 'espresso',
    EMBER = 'ember',
    SYNTHWAVE = 'synthwave',
    PARCHMENT = 'parchment',
    MATRIX = 'matrix',
    GLACIER = 'glacier',
    MIDNIGHT = 'midnight',
    NEON_CITY = 'neon-city',
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
    [EThemeScheme.DUSK]: 'Dusk',
    [EThemeScheme.CARBON]: 'Carbon',
    [EThemeScheme.OCEAN]: 'Ocean',
    [EThemeScheme.COPPER]: 'Copper',
    [EThemeScheme.NOIR]: 'Noir',
    [EThemeScheme.COBALT]: 'Cobalt',
    [EThemeScheme.ESPRESSO]: 'Espresso',
    [EThemeScheme.EMBER]: 'Ember',
    [EThemeScheme.SYNTHWAVE]: 'Synthwave',
    [EThemeScheme.PARCHMENT]: 'Parchment',
    [EThemeScheme.MATRIX]: 'Matrix',
    [EThemeScheme.GLACIER]: 'Glacier',
    [EThemeScheme.MIDNIGHT]: 'Midnight',
    [EThemeScheme.NEON_CITY]: 'Neon City',
};

export interface IThemeSchemePreview {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
}

export const THEME_SCHEME_PREVIEWS: Record<EThemeScheme, IThemeSchemePreview> = {
    [EThemeScheme.DUSK]: {primary: '#6D28D9', secondary: '#6B7280', accent: '#E11D48', text: '#111827', background: '#FAF9FC'},
    [EThemeScheme.CARBON]: {primary: '#18181B', secondary: '#71717A', accent: '#F97316', text: '#09090B', background: '#FAFAFA'},
    [EThemeScheme.OCEAN]: {primary: '#0369A1', secondary: '#64748B', accent: '#06B6D4', text: '#082F49', background: '#F0F9FF'},
    [EThemeScheme.COPPER]: {primary: '#C2410C', secondary: '#78716C', accent: '#EA580C', text: '#1A1210', background: '#FEFBF6'},
    [EThemeScheme.NOIR]: {primary: '#92700A', secondary: '#64605A', accent: '#B8860B', text: '#1A1814', background: '#FCFBF8'},
    [EThemeScheme.COBALT]: {primary: '#1E40AF', secondary: '#6B7280', accent: '#CA8A04', text: '#111827', background: '#F7F8FC'},
    [EThemeScheme.ESPRESSO]: {primary: '#6B4226', secondary: '#7C7068', accent: '#B8860B', text: '#2C1810', background: '#FBF8F4'},
    [EThemeScheme.EMBER]: {primary: '#991B1B', secondary: '#78706C', accent: '#B8860B', text: '#1C1210', background: '#FDF8F6'},
    [EThemeScheme.SYNTHWAVE]: {primary: '#C026D3', secondary: '#6B6880', accent: '#06B6D4', text: '#18101F', background: '#FAF6FF'},
    [EThemeScheme.PARCHMENT]: {primary: '#5C3317', secondary: '#8C7B6A', accent: '#C0850A', text: '#2C1A08', background: '#FAF3E0'},
    [EThemeScheme.MATRIX]: {primary: '#166534', secondary: '#6B7A6A', accent: '#047857', text: '#0D1F0D', background: '#F4FAF0'},
    [EThemeScheme.GLACIER]: {primary: '#546E7A', secondary: '#6B8090', accent: '#4DD0E1', text: '#102030', background: '#F5F8FA'},
    [EThemeScheme.MIDNIGHT]: {primary: '#1E1B4B', secondary: '#64748B', accent: '#4F46E5', text: '#0A0A1E', background: '#F8F9FC'},
    [EThemeScheme.NEON_CITY]: {primary: '#0038FF', secondary: '#6B6D80', accent: '#FF0066', text: '#04081E', background: '#F0F4FF'},
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
