'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@/lib/auth';
import { saveAuth, clearAuth, loginAsGuest } from '@/lib/auth';

interface AuthStore {
    user: AuthUser | null;
    isLoading: boolean;

    // 액션
    initialize: () => void;
    loginAsGuest: () => AuthUser;
    login: (user: AuthUser) => void;
    logout: () => void;
    updateUser: (updates: Partial<AuthUser>) => void;
    isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthStore>()(
    persist(
        (set, get) => ({
            user: null,
            isLoading: true,

            // 초기화: localStorage에서 로드
            initialize: () => {
                // persist 미들웨어가 자동으로 localStorage에서 로드하므로
                // 여기서는 isLoading만 false로 설정
                set({ isLoading: false });
            },

            // 게스트 로그인
            loginAsGuest: () => {
                const user = loginAsGuest(); // auth.ts의 함수 사용 (쿠키 + localStorage 저장)
                set({ user, isLoading: false });
                return user;
            },

            // 일반 로그인 (구글 로그인 등)
            login: (user: AuthUser) => {
                saveAuth(user); // 쿠키 + localStorage 저장
                set({ user, isLoading: false });
            },

            // 로그아웃
            logout: () => {
                clearAuth(); // 쿠키 + localStorage 삭제
                set({ user: null });
            },

            // 사용자 정보 업데이트 (캐릭터 외형 등)
            updateUser: (updates: Partial<AuthUser>) => {
                const currentUser = get().user;
                if (!currentUser) return;

                const updatedUser: AuthUser = {
                    ...currentUser,
                    ...updates,
                };
                saveAuth(updatedUser); // 쿠키 + localStorage 업데이트
                set({ user: updatedUser });
            },

            // 인증 여부 확인
            isAuthenticated: () => {
                return !!get().user;
            },
        }),
        {
            name: 'auth-storage', // localStorage 키
            // persist 미들웨어가 user를 자동으로 localStorage에 저장/로드
            // 하지만 쿠키도 저장해야 하므로 login, updateUser, logout에서 saveAuth/clearAuth 호출
        }
    )
);
