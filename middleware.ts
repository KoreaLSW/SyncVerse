import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

function parseAuthCookie(raw?: string) {
    if (!raw) return null;
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

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // 1) 기존 커스텀 쿠키(게스트/외형 저장)
    const authCookie = request.cookies.get('syncverse_auth')?.value;
    const auth = parseAuthCookie(authCookie);

    // 2) NextAuth 로그인 상태(구글)
    const nextAuthToken = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const isAuthenticated = !!auth || !!nextAuthToken;
    const hasAppearance = !!auth?.headColor && !!auth?.bodyColor;

    if (pathname === '/login') {
        // 🚀 구글 로그인(nextAuthToken)이 되어있는 경우에만 자동 리다이렉트
        // 게스트(auth)는 로그인 페이지 접근 허용
        if (nextAuthToken) {
            return NextResponse.redirect(
                new URL(hasAppearance ? '/' : '/character-setup', request.url)
            );
        }
        return NextResponse.next();
    }

    if (pathname === '/character-setup') {
        if (!isAuthenticated)
            return NextResponse.redirect(new URL('/login', request.url));
        // 외형 있으면 들어가지 못하게 막지 말고(수정 가능), 여기서는 통과
        return NextResponse.next();
    }

    if (pathname === '/') {
        if (!isAuthenticated)
            return NextResponse.redirect(new URL('/login', request.url));
        if (!hasAppearance)
            return NextResponse.redirect(
                new URL('/character-setup', request.url)
            );
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/login', '/character-setup'],
};
