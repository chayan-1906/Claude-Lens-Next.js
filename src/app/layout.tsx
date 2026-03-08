import React from "react";
import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";
import {ThemeResolver} from "@/components/ThemeResolver";
import {DEFAULT_THEME_MODE, DEFAULT_THEME_SCHEME, THEME_MODE_COOKIE, THEME_SCHEME_COOKIE} from "@/types/theme";

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Claude Lens',
    description: 'Browse Claude Code sessions from any device',
};

/** Inline script to set theme data attributes synchronously before paint (prevents FOUC) */
const themeInitScript: string = `(function(){function g(n){var m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)'));return m?m[2]:null}document.documentElement.dataset.scheme=g('${THEME_SCHEME_COOKIE}')||'${DEFAULT_THEME_SCHEME}';document.documentElement.dataset.mode=g('${THEME_MODE_COOKIE}')||'${DEFAULT_THEME_MODE}'})()`;

function RootLayout({children}: Readonly<{ children: React.ReactNode; }>) {
    return (
        <html lang={'en'} suppressHydrationWarning>
        <head>
            <script dangerouslySetInnerHTML={{__html: themeInitScript}}/>
        </head>
        <body className={`${inter.variable} antialiased bg-background text-text`}>
        <React.Suspense>
            <ThemeResolver>{children}</ThemeResolver>
        </React.Suspense>
        </body>
        </html>
    );
}

export default RootLayout;
