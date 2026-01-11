// 플레이어 위치 정보
export interface PlayerPosition {
    x: number;
    y: number;
}

// 캐릭터 방향
export type CharacterDirection = 'up' | 'down' | 'left' | 'right';

// 캐릭터 이미지 정보
export interface CharacterAppearance {
    headColor: 'amber' | 'black' | 'bronze' | 'green' | 'light' | 'white';
    bodyColor: 'amber' | 'black' | 'bronze' | 'green' | 'light' | 'white';
    direction?: CharacterDirection; // 방향 추가
}

// 플레이어 데이터 (Yjs에 저장되는 구조)
export interface PlayerData extends PlayerPosition, CharacterAppearance {
    userId: string;
    email?: string; // email 추가 (구글 로그인 사용자의 경우)
    isMoving?: boolean; // 키 입력 기반 이동 여부(걷기 모션 여부)
    message?: string; // 🚀 추가: 현재 출력 중인 메시지
    messageTimestamp?: number; // 🚀 추가: 메시지 생성 시간 (5초 후 삭제 로직용)
}

// 컴포넌트에서 사용하는 플레이어 정보
export interface Player extends PlayerData {
    id: string; // Yjs Map의 key
}

// Awareness에 저장할 유저 정보
export interface UserAwareness {
    userId: string;
    userName?: string;
    isActive?: boolean;
}
