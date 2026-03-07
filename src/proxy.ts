import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {SETUP_CONFIGURED_COOKIE} from "@/types/setup";

const SETUP_PATH: string = '/setup';

export function proxy(request: NextRequest) {
    const {pathname} = request.nextUrl;
    const isConfigured: boolean = request.cookies.get(SETUP_CONFIGURED_COOKIE)?.value === 'true';

    // Not configured + not on setup page → redirect to setup
    if (!isConfigured && pathname !== SETUP_PATH) {
        return NextResponse.redirect(new URL(SETUP_PATH, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};
