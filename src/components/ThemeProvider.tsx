"use client";

import React from "react";
import {setThemeMode, setThemeScheme} from "@/actions/theme.actions";
import type {IThemeContext, IThemeProviderProps} from "@/types/theme";
import {EThemeMode, EThemeScheme, THEME_MODE_COOKIE, THEME_SCHEME_COOKIE} from "@/types/theme";

const COOKIE_MAX_AGE: number = 60 * 60 * 24 * 365;

const ThemeContext = React.createContext<IThemeContext | null>(null);

function ThemeProvider({children, initialScheme, initialMode}: IThemeProviderProps) {
    const [scheme, setSchemeState] = React.useState<EThemeScheme>(initialScheme);
    const [mode, setModeState] = React.useState<EThemeMode>(initialMode);

    const setScheme = React.useCallback((newScheme: EThemeScheme): void => {
        setSchemeState(newScheme);
        document.documentElement.dataset.scheme = newScheme;
        document.cookie = `${THEME_SCHEME_COOKIE}=${newScheme};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
        setThemeScheme(newScheme);
    }, []);

    const setMode = React.useCallback((newMode: EThemeMode): void => {
        setModeState(newMode);
        document.documentElement.dataset.mode = newMode;
        document.cookie = `${THEME_MODE_COOKIE}=${newMode};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
        setThemeMode(newMode);
    }, []);

    const value: IThemeContext = {scheme, mode, setScheme, setMode};

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

function useTheme(): IThemeContext {
    const context: IThemeContext | null = React.useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

export {ThemeProvider, useTheme};
