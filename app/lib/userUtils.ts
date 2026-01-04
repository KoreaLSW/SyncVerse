'use client';

import { apiClient } from './api';
import type { CharacterAppearance } from './types';
import { clearAuth } from './auth'; // 🚀 clearAuth 임포트
import { signOut } from 'next-auth/react';

/**
 * 현재 플레이어의 위치를 DB에 저장
 * @param username - 사용자 username (구글 로그인) 또는 null (게스트)
 * @param x - X 좌표
 * @param y - Y 좌표
 */
export async function savePlayerPosition(
    username: string | null | undefined,
    x: number,
    y: number
): Promise<void> {
    // 게스트 사용자나 username이 없으면 DB에 저장하지 않음
    if (!username) {
        return;
    }

    try {
        await apiClient.patch(`/api/users/${username}`, {
            position_x: x,
            position_y: y,
        });
    } catch (error) {
        console.error('위치 저장 실패:', error);
        // 실패해도 게임 진행에는 영향 없음
    }
}

/**
 * DB에서 플레이어의 마지막 위치를 가져옴
 * @param username - 사용자 username (구글 로그인) 또는 null (게스트)
 */
export async function getPlayerPosition(
    username: string | null | undefined
): Promise<{ x: number; y: number } | null> {
    // 게스트 사용자나 username이 없으면 DB에서 위치를 가져올 수 없음
    if (!username) {
        return null;
    }

    try {
        const response = await apiClient.get(`/api/users/${username}`);
        const user = response.data.data;

        if (user?.position_x != null && user?.position_y != null) {
            return {
                x: Number(user.position_x),
                y: Number(user.position_y),
            };
        }
        return null;
    } catch (error: any) {
        console.error('위치 로드 실패:', error);

        if (error.response?.status === 404) {
            alert('사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');

            // 1. 커스텀 인증 정보 삭제
            clearAuth();
            localStorage.removeItem('auth-storage');

            // 2. 🚀 NextAuth 세션까지 완전히 종료하고 로그인 페이지로 이동
            signOut({ callbackUrl: '/login' });
        }

        return null;
    }
}

/**
 * 사용자의 캐릭터 외형 설정을 DB에 저장
 */
export async function updateUserAppearance(
    username: string,
    appearance: Partial<CharacterAppearance>
): Promise<void> {
    if (!username) return;

    try {
        await apiClient.patch(`/api/users/${username}`, {
            headColor: appearance.headColor,
            bodyColor: appearance.bodyColor,
        });
    } catch (error: any) {
        console.error('위치 로드 실패:', error);

        if (error.response?.status === 404) {
            alert('사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');

            // 1. 커스텀 인증 정보 삭제
            clearAuth();
            localStorage.removeItem('auth-storage');

            // 2. 🚀 NextAuth 세션까지 완전히 종료하고 로그인 페이지로 이동
            signOut({ callbackUrl: '/login' });
        }

        throw error;
    }
}

/**
 * 사용자 정보 업데이트 (통합)
 */
export async function updateUserInfo(
    username: string,
    data: any
): Promise<void> {
    if (!username) return;
    try {
        await apiClient.patch(`/api/users/${username}`, data);
    } catch (error) {
        console.error('사용자 정보 업데이트 실패:', error);
        throw error;
    }
}
