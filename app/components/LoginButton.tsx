'use client';

import { useAuthStore } from '../stores/authStore';
import { clearAuth } from '../lib/auth';
import { signOut } from 'next-auth/react';

export function LoginButton() {
    const { user } = useAuthStore();

    const handleAuthAction = async () => {
        // 1. 커스텀 인증 정보 삭제
        clearAuth();
        localStorage.removeItem('auth-storage');

        // 2. NextAuth 세션 종료 및 로그인 페이지 이동
        await signOut({ callbackUrl: '/login' });
    };

    if (user?.authType === 'guest') {
        return (
            <button
                onClick={handleAuthAction}
                className='bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 px-4 py-2 rounded-lg text-sm transition font-medium shadow-lg'
            >
                구글 로그인
            </button>
        );
    }

    return (
        <button
            onClick={handleAuthAction}
            className='bg-red-600 hover:bg-red-700 text-white border border-red-500 px-4 py-2 rounded-lg text-sm transition font-medium shadow-lg'
        >
            로그아웃
        </button>
    );
}
