'use client';

import * as Y from 'yjs';
import type {
    PlayerData,
    Player,
    CharacterAppearance,
    CharacterDirection,
} from './types';

// 유저 ID 생성 및 관리
const USER_ID_KEY = 'syncverse_user_id';

// getOrCreateUserId 함수를 auth.ts의 함수를 사용하도록 변경하거나
// 기존 함수는 유지하고, auth.ts의 loadAuth를 먼저 확인하도록 수정

import { generateGuestId, loadAuth } from './auth';

export function getOrCreateUserId(): string {
    if (typeof window === 'undefined') {
        return `temp_${Date.now()}`;
    }

    // 먼저 인증된 사용자 정보 확인
    const auth = loadAuth();
    if (auth) {
        return auth.userId;
    }

    // 기존 로직 (하위 호환성)
    let userId = localStorage.getItem(USER_ID_KEY);
    if (!userId) {
        userId = generateGuestId();
        localStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
}

// 스프라이트 시트 설정
const SPRITE_SIZE = 64; // 한 칸당 크기
const SPRITE_ROWS = {
    up: 8, // 9번째 줄 (인덱스 8)
    left: 9, // 10번째 줄 (인덱스 9)
    down: 10, // 11번째 줄 (인덱스 10)
    right: 11, // 12번째 줄 (인덱스 11)
};

// 스프라이트 시트에서 배경 위치 계산
// 스프라이트 시트에서 배경 위치 계산 (프레임 인덱스 추가)
export function getSpriteBackgroundPosition(
    direction: CharacterDirection = 'down',
    frameIndex: number = 0 // 0: 기본 프레임, 1,2,3...: 걷는 모션 프레임
): string {
    const row = SPRITE_ROWS[direction];
    const y = -row * SPRITE_SIZE; // 음수로 위로 이동
    const x = -frameIndex * SPRITE_SIZE; // 프레임 인덱스에 따라 왼쪽으로 이동
    return `${x}px ${y}px`;
}

// 캐릭터 이미지 경로 생성 (스프라이트 시트 경로 반환)
export function getCharacterImagePath(
    headColor: CharacterAppearance['headColor'],
    bodyColor: CharacterAppearance['bodyColor']
): { head: string; body: string } {
    return {
        head: `/character/head/human_male/${headColor}.png`,
        body: `/character/body/body_color/${bodyColor}.png`,
    };
}

// 기본 플레이어 데이터 생성
export function getDefaultPlayerData(userId: string): PlayerData {
    return {
        userId,
        x: 0,
        y: 0,
        headColor: 'amber',
        bodyColor: 'amber',
        direction: 'down', // 기본 방향
        isMoving: false,
    };
}

// Yjs Map에서 players Map 가져오기 (없으면 생성)
export function getPlayersMap(ydoc: Y.Doc): Y.Map<PlayerData> {
    return ydoc.getMap<PlayerData>('players');
}

// Yjs Map 데이터를 Player 배열로 변환
export function getPlayersFromYjs(playersMap: Y.Map<PlayerData>): Player[] {
    const players: Player[] = [];
    playersMap.forEach((playerData, userId) => {
        players.push({
            id: userId,
            ...playerData,
        });
    });
    return players;
}

// Yjs Map에 플레이어 데이터 설정
export function setPlayerData(
    playersMap: Y.Map<PlayerData>,
    userId: string,
    data: Partial<PlayerData>
): void {
    const currentData = playersMap.get(userId);
    const updatedData: PlayerData = {
        ...(currentData || getDefaultPlayerData(userId)), // ① 기존 데이터 또는 기본값
        ...data, // ② 새로운 데이터로 덮어쓰기
        userId, // ③ userId 강제 설정
    };

    playersMap.set(userId, updatedData);
}

// 플레이어 데이터 가져오기
export function getPlayerData(
    playersMap: Y.Map<PlayerData>,
    userId: string
): PlayerData | undefined {
    return playersMap.get(userId);
}
