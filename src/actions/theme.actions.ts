"use server";

import {cookies} from "next/headers";
import {EThemeScheme, EThemeMode, THEME_SCHEME_COOKIE, THEME_MODE_COOKIE} from "@/types/theme";

async function setThemeScheme(scheme: EThemeScheme): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(THEME_SCHEME_COOKIE, scheme, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
    });
}

async function setThemeMode(mode: EThemeMode): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(THEME_MODE_COOKIE, mode, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
    });
}

export {setThemeScheme, setThemeMode};
