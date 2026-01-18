'use client';

import { CharacterAppearance } from './types';

// 인증 타입 정의
export type AuthType = 'google' | 'guest' | null;

export interface AuthUser {
    userId: string;
    authType: AuthType;
    email?: string; // 구글 로그인 시
    name?: string; // 구글 로그인 시
    username?: string; // 🚀 구글 로그인 시 username
    nickname?: string; // 🚀 구글 로그인 시 nickname

    headColor?: CharacterAppearance['headColor'];
    bodyColor?: CharacterAppearance['bodyColor'];

    lastX?: number; // 🚀 마지막 X 좌표 (게스트용)
    lastY?: number; // 🚀 마지막 Y 좌표 (게스트용)
}

const AUTH_STORAGE_KEY = 'syncverse_auth';
const USER_ID_KEY = 'syncverse_user_id';
const AUTH_COOKIE_NAME = 'syncverse_auth';

// 게스트 ID 생성
export function generateGuestId(): string {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 쿠키 설정 (클라이언트에서)
function setCookie(name: string, value: string, days: number = 365) {
    if (typeof document === 'undefined') return;

    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

    // 중요: JSON 그대로 넣으면 쿠키 파싱이 깨질 수 있어서 인코딩
    const encoded = encodeURIComponent(value);

    document.cookie = `${name}=${encoded};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

// 쿠키 삭제
function deleteCookie(name: string) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// 인증 정보 저장 (쿠키 + localStorage)
export function saveAuth(user: AuthUser): void {
    if (typeof window === 'undefined') return;

    const authJson = JSON.stringify(user);

    // localStorage 저장 (클라이언트에서 사용)
    localStorage.setItem(AUTH_STORAGE_KEY, authJson);
    localStorage.setItem(USER_ID_KEY, user.userId);

    // 쿠키 저장 (미들웨어에서 사용)
    setCookie(AUTH_COOKIE_NAME, authJson, 365);
}

// 인증 정보 불러오기 (localStorage 우선, 쿠키 폴백)
export function loadAuth(): AuthUser | null {
    if (typeof window === 'undefined') return null;

    // localStorage에서 먼저 확인
    const authStr = localStorage.getItem(AUTH_STORAGE_KEY);
    if (authStr) {
        try {
            return JSON.parse(authStr);
        } catch {
            // 파싱 실패 시 localStorage 정리
            localStorage.removeItem(AUTH_STORAGE_KEY);
        }
    }

    // 쿠키에서 확인 (fallback)
    if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find((c) =>
            c.trim().startsWith(`${AUTH_COOKIE_NAME}=`)
        );
        if (authCookie) {
            try {
                const value = authCookie.split('=')[1];
                const user = JSON.parse(decodeURIComponent(value));
                // 쿠키에서 가져온 값을 localStorage에도 저장
                saveAuth(user);
                return user;
            } catch {
                // 파싱 실패 시 쿠키 삭제
                deleteCookie(AUTH_COOKIE_NAME);
            }
        }
    }

    return null;
}

// 인증 정보 제거 (쿠키 + localStorage)
export function clearAuth(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_ID_KEY);
    deleteCookie(AUTH_COOKIE_NAME);
}

// 게스트로 로그인
export function loginAsGuest(): AuthUser {
    const guestId = generateGuestId();
    const user: AuthUser = {
        userId: guestId,
        authType: 'guest',
    };
    saveAuth(user);
    return user;
}
