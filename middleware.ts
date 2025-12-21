import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function parseAuthCookie(raw?: string) {
    if (!raw) return null;
    // 쿠키가 인코딩되어 있을 수도/없을 수도 있어서 둘 다 시도
    try {
        return JSON.parse(decodeURIComponent(raw));
    } catch {
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }
}

export function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    const authCookie = request.cookies.get('syncverse_auth')?.value;
    const auth = parseAuthCookie(authCookie);
    const isAuthenticated = !!auth;
    const hasAppearance = !!auth?.headColor && !!auth?.bodyColor;

    if (pathname === '/login') {
        if (isAuthenticated) {
            // 이미 로그인한 사람은 로그인페이지 못 보게
            return NextResponse.redirect(
                new URL(hasAppearance ? '/' : '/character-setup', request.url)
            );
        }
        return NextResponse.next();
    }

    if (pathname === '/character-setup') {
        // 로그인만 되어 있으면 언제든 수정 가능
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        return NextResponse.next();
    }

    if (pathname === '/') {
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL('/login', request.url));
        }
        // “처음 한 번만” 강제: 외형 없을 때만 설정 페이지로 보냄
        if (!hasAppearance) {
            return NextResponse.redirect(
                new URL('/character-setup', request.url)
            );
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/login', '/character-setup'],
};
