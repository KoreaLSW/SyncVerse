'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { PlayerPosition, CharacterDirection } from '@/app/lib/types';

// 이동 속도 설정 (픽셀/프레임)
const MOVE_SPEED = 5;

// 화면 경계 설정 (나중에 동적으로 설정 가능)
export interface Boundary {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

// 기본 경계값 (전체 화면 기준)
const DEFAULT_BOUNDARY: Boundary = {
    minX: 0,
    maxX: typeof window !== 'undefined' ? window.innerWidth : 1920,
    minY: 0,
    maxY: typeof window !== 'undefined' ? window.innerHeight : 1080,
};

interface UseKeyboardMovementOptions {
    enabled?: boolean; // 키보드 입력 활성화 여부
    speed?: number; // 이동 속도
    boundary?: Boundary; // 이동 제한 경계
    onMove?: (
        delta: { dx: number; dy: number },
        direction: CharacterDirection
    ) => void; // 이동 콜백 (방향 추가)
    onStop?: (direction: CharacterDirection) => void; // 키 입력이 멈췄을 때(정지) 콜백
}

interface MovementState {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
}

export function useKeyboardMovement(options: UseKeyboardMovementOptions = {}) {
    const {
        enabled = true,
        speed = MOVE_SPEED,
        boundary: _boundary = DEFAULT_BOUNDARY,
        onMove,
        onStop,
    } = options;

    // NOTE: boundary는 현재 훅 내부에서는 사용하지 않지만(실제 clamp는 usePlayerPosition에서 처리),
    // API 호환/확장성을 위해 옵션으로 유지한다.
    void _boundary;

    const [keys, setKeys] = useState<MovementState>({
        up: false,
        down: false,
        left: false,
        right: false,
    });

    const wasMovingRef = useRef(false);
    const lastDirectionRef = useRef<CharacterDirection>('down');

    // 키 다운 핸들러
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // 방향키 감지
            switch (event.key) {
                case 'ArrowUp':
                    event.preventDefault();
                    setKeys((prev) => ({ ...prev, up: true }));
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    setKeys((prev) => ({ ...prev, down: true }));
                    break;
                case 'ArrowLeft':
                    event.preventDefault();
                    setKeys((prev) => ({ ...prev, left: true }));
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    setKeys((prev) => ({ ...prev, right: true }));
                    break;
            }
        },
        [enabled]
    );

    // 키 업 핸들러
    const handleKeyUp = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            switch (event.key) {
                case 'ArrowUp':
                    setKeys((prev) => ({ ...prev, up: false }));
                    break;
                case 'ArrowDown':
                    setKeys((prev) => ({ ...prev, down: false }));
                    break;
                case 'ArrowLeft':
                    setKeys((prev) => ({ ...prev, left: false }));
                    break;
                case 'ArrowRight':
                    setKeys((prev) => ({ ...prev, right: false }));
                    break;
            }
        },
        [enabled]
    );

    // 키보드 이벤트 리스너 등록
    useEffect(() => {
        if (!enabled) return;

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [enabled, handleKeyDown, handleKeyUp]);

    // 이동 델타 계산 및 적용
    useEffect(() => {
        if (!enabled) return;

        // 애니메이션 프레임을 사용한 부드러운 이동
        let animationFrameId: number;
        let lastTime = performance.now();

        const updateMovement = (currentTime: number) => {
            const deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // 프레임 시간에 따른 이동량 계산 (60fps 기준 정규화)
            const frameMultiplier = deltaTime / (1000 / 60);

            // 이동 방향 계산
            let dx = 0;
            let dy = 0;

            if (keys.up) dy -= speed * frameMultiplier;
            if (keys.down) dy += speed * frameMultiplier;
            if (keys.left) dx -= speed * frameMultiplier;
            if (keys.right) dx += speed * frameMultiplier;

            // 대각선 이동 시 속도 정규화 (대각선이 더 빠르지 않도록)
            if (dx !== 0 && dy !== 0) {
                const length = Math.sqrt(dx * dx + dy * dy);
                const normalizedSpeed = speed * frameMultiplier;
                dx = (dx / length) * normalizedSpeed;
                dy = (dy / length) * normalizedSpeed;
            }

            // 캐릭터 방향 계산 (우선순위: up > down > left > right)
            const characterDirection: CharacterDirection = keys.up
                ? 'up'
                : keys.down
                ? 'down'
                : keys.left
                ? 'left'
                : keys.right
                ? 'right'
                : lastDirectionRef.current; // 키가 없으면 마지막 방향 유지
            // 마지막 방향 저장(키가 눌려있을 때만 갱신)
            if (keys.up || keys.down || keys.left || keys.right) {
                lastDirectionRef.current = characterDirection;
            }

            // 이동이 있을 때만 콜백 호출 (방향 정보 포함)
            if ((dx !== 0 || dy !== 0) && onMove) {
                onMove({ dx, dy }, characterDirection);
            }

            //console.log("characterDirection", characterDirection);
            animationFrameId = requestAnimationFrame(updateMovement);
        };

        animationFrameId = requestAnimationFrame(updateMovement);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [enabled, keys, speed, onMove]);

    // 키 입력 기반 "정지" 감지: moving -> not moving 전환 시 onStop을 딱 1번 호출
    useEffect(() => {
        if (!enabled) return;

        const nowMoving = keys.up || keys.down || keys.left || keys.right;
        const wasMoving = wasMovingRef.current;

        if (nowMoving) {
            // moving 상태 진입
            wasMovingRef.current = true;
        } else if (wasMoving) {
            // moving -> stop 전환
            wasMovingRef.current = false;
            onStop?.(lastDirectionRef.current);
        }
    }, [enabled, keys.up, keys.down, keys.left, keys.right, onStop]);

    // 현재 이동 방향 반환 (UI 표시용)
    const movementDirection = {
        dx: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
        dy: (keys.down ? 1 : 0) - (keys.up ? 1 : 0),
    };

    // 캐릭터 방향 계산 (반환용)
    const characterDirection: CharacterDirection = keys.up
        ? 'up'
        : keys.down
        ? 'down'
        : keys.left
        ? 'left'
        : keys.right
        ? 'right'
        : 'down'; // 기본값

    return {
        keys, // 현재 눌린 키 상태
        movementDirection, // 이동 방향 (-1, 0, 1)
        characterDirection, // 캐릭터 방향 ("up" | "down" | "left" | "right")
        isMoving: keys.up || keys.down || keys.left || keys.right, // 이동 중인지 여부
    };
}

// 경계 내로 위치 제한하는 헬퍼 함수
export function clampPosition(
    position: PlayerPosition,
    boundary: Boundary
): PlayerPosition {
    return {
        x: Math.max(boundary.minX, Math.min(boundary.maxX, position.x)),
        y: Math.max(boundary.minY, Math.min(boundary.maxY, position.y)),
    };
}

// 새 위치 계산 (경계 체크 포함)
export function calculateNewPosition(
    currentPosition: PlayerPosition,
    delta: { dx: number; dy: number },
    boundary: Boundary
): PlayerPosition {
    const newPosition: PlayerPosition = {
        x: currentPosition.x + delta.dx,
        y: currentPosition.y + delta.dy,
    };

    return clampPosition(newPosition, boundary);
}
