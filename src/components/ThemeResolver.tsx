import React from "react";
import {cookies} from "next/headers";
import {ThemeProvider} from "@/components/ThemeProvider";
import type {EThemeScheme, EThemeMode} from "@/types/theme";
import {DEFAULT_THEME_MODE, DEFAULT_THEME_SCHEME, THEME_MODE_COOKIE, THEME_SCHEME_COOKIE} from "@/types/theme";

async function ThemeResolver({children}: Readonly<{ children: React.ReactNode; }>) {
    const cookieStore = await cookies();
    const scheme: EThemeScheme = (cookieStore.get(THEME_SCHEME_COOKIE)?.value as EThemeScheme) || DEFAULT_THEME_SCHEME;
    const mode: EThemeMode = (cookieStore.get(THEME_MODE_COOKIE)?.value as EThemeMode) || DEFAULT_THEME_MODE;

    return (
        <ThemeProvider initialScheme={scheme} initialMode={mode}>
            {children}
        </ThemeProvider>
    );
}

export {ThemeResolver};
