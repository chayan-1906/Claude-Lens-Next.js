import React from "react";
import type {Metadata} from "next";
import {cookies} from "next/headers";
import {Inter} from "next/font/google";
import "./globals.css";
import {ThemeProvider} from "@/components/ThemeProvider";
import type {EThemeScheme, EThemeMode} from "@/types/theme";
import {DEFAULT_THEME_MODE, DEFAULT_THEME_SCHEME, THEME_MODE_COOKIE, THEME_SCHEME_COOKIE} from "@/types/theme";

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Claude Lens',
    description: 'Browse Claude Code conversation sessions from any device',
};

async function RootLayout({children}: Readonly<{ children: React.ReactNode; }>) {
    const cookieStore = await cookies();
    const scheme: EThemeScheme = (cookieStore.get(THEME_SCHEME_COOKIE)?.value as EThemeScheme) || DEFAULT_THEME_SCHEME;
    const mode: EThemeMode = (cookieStore.get(THEME_MODE_COOKIE)?.value as EThemeMode) || DEFAULT_THEME_MODE;

    return (
        <html lang={'en'} data-scheme={scheme} data-mode={mode}>
        <body className={`${inter.variable} antialiased bg-background text-text`}>
        <ThemeProvider initialScheme={scheme} initialMode={mode}>
            {children}
        </ThemeProvider>
        </body>
        </html>
    );
}

export default RootLayout;
