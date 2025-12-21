'use client';

import { useState, useEffect } from 'react';
import type { AuthUser } from '@/app/lib/auth';
import { loadAuth, clearAuth } from '@/app/lib/auth';

export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 초기 로드 시 저장된 인증 정보 확인
        const savedAuth = loadAuth();
        setUser(savedAuth);
        setIsLoading(false);
    }, []);

    const logout = () => {
        clearAuth();
        setUser(null);
    };

    return {
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
        setUser,
    };
}
