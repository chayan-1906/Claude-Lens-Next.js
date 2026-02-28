import React from "react";
import type {Metadata} from "next";
import {Inter} from "next/font/google";
import "./globals.css";

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
});

export const metadata: Metadata = {
    title: 'Claude Lens',
    description: 'Browse Claude Code conversation sessions from any device',
};

function RootLayout({children}: Readonly<{ children: React.ReactNode; }>) {
    return (
        <html lang={'en'}>
        <body className={`${inter.variable} antialiased`}>
        {children}
        </body>
        </html>
    );
}

export default RootLayout;
