import type { NextRequest } from 'next/server';

export type ServerAuthUser = {
    userId: string;
    authType?: 'google' | 'guest' | null;
    username?: string;
    nickname?: string;
    email?: string;
};

function parseAuthCookie(raw?: string): ServerAuthUser | null {
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

export function getAuthUserFromRequest(
    request: NextRequest
): ServerAuthUser | null {
    const raw = request.cookies.get('syncverse_auth')?.value;
    return parseAuthCookie(raw);
}
