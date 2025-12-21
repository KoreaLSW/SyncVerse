'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import {
    getOrCreateUserId,
    getPlayersMap,
    getPlayersFromYjs,
    setPlayerData,
    getPlayerData,
    getDefaultPlayerData,
} from '@/app/lib/playerUtils';
import type {
    Player,
    PlayerData,
    PlayerPosition,
    CharacterDirection,
} from '@/app/lib/types';
import {
    calculateNewPosition,
    type Boundary,
} from '@/app/hooks/useKeyboardMovement';
import { loadAuth } from '../lib/auth';

interface UsePlayerPositionOptions {
    ydoc: Y.Doc | null;
    awareness: HocuspocusProvider['awareness'] | null;
    boundary?: Boundary;
    enabled?: boolean;
}

export function usePlayerPosition(options: UsePlayerPositionOptions) {
    const { ydoc, awareness, boundary, enabled = true } = options;

    // 내 유저 ID
    const userIdRef = useRef<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // 플레이어 Map
    const [playersMap, setPlayersMap] = useState<Y.Map<PlayerData> | null>(
        null
    );

    // 모든 플레이어 데이터
    const [allPlayers, setAllPlayers] = useState<Player[]>([]);

    // 내 플레이어 데이터
    const [myPlayer, setMyPlayer] = useState<Player | null>(null);

    // 유저 ID 초기화
    useEffect(() => {
        if (!enabled) return;

        const id = getOrCreateUserId();
        userIdRef.current = id;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUserId(id);
    }, [enabled]);

    // Yjs Map 초기화
    useEffect(() => {
        if (!ydoc || !enabled) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPlayersMap(null);
            return;
        }

        // ydoc에서 players Map 가져오기
        const map = getPlayersMap(ydoc);
        setPlayersMap(map);

        // 초기 플레이어 데이터 로드
        const players = getPlayersFromYjs(map);
        setAllPlayers(players);

        // 다른 플레이어 위치 변경 감지
        const handleMapChange = () => {
            const updatedPlayers = getPlayersFromYjs(map);
            setAllPlayers(updatedPlayers);

            console.log('updatedPlayers!!!', updatedPlayers);

            // 내 플레이어 데이터도 업데이트
            if (userIdRef.current) {
                const myData = map.get(userIdRef.current);
                if (myData) {
                    setMyPlayer({
                        id: userIdRef.current,
                        ...myData,
                    });
                    return;
                }

                // (중요) 새로고침/재연결 과정에서 서버 onDisconnect가 players에서 내 엔트리를 지워버릴 수 있음.
                // 그 경우 "내 엔트리"는 클라이언트가 즉시 다시 만들어서 화면/상태가 깨지지 않게 한다.
                const defaultData = getDefaultPlayerData(userIdRef.current);
                map.set(userIdRef.current, defaultData);
                setMyPlayer({
                    id: userIdRef.current,
                    ...defaultData,
                });
            }
        };

        map.observe(handleMapChange);

        return () => {
            map.unobserve(handleMapChange);
        };
    }, [ydoc, enabled]);

    // (중요) 새로고침/재연결 레이스 방지:
    // ydoc(playersMap)과 userId가 준비된 순간에 "내 플레이어 엔트리 존재"를 보장한다.
    useEffect(() => {
        if (!enabled) return;
        if (!playersMap) return;
        if (!userId) return;

        const existing = playersMap.get(userId);

        const auth = loadAuth();
        const appearance =
            auth?.headColor && auth?.bodyColor
                ? { headColor: auth.headColor, bodyColor: auth.bodyColor }
                : null;

        if (!existing) {
            const defaultData = getDefaultPlayerData(userId);
            const initial = appearance
                ? { ...defaultData, ...appearance }
                : defaultData;

            playersMap.set(userId, initial);
            setMyPlayer({ id: userId, ...initial });
            return;
        }

        if (
            appearance &&
            (existing.headColor !== appearance.headColor ||
                existing.bodyColor !== appearance.bodyColor)
        ) {
            setPlayerData(playersMap, userId, appearance);
        }

        // 기존 데이터가 있으면 그대로 사용 (isMoving 기본값 보정만)
        if (existing.isMoving === undefined) {
            setPlayerData(playersMap, userId, { isMoving: false });
        }

        setMyPlayer({ id: userId, ...existing });
    }, [enabled, playersMap, userId]);

    // 내 위치 업데이트 함수 (방향 정보 포함)
    const updateMyPosition = useCallback(
        (delta: { dx: number; dy: number }, direction: CharacterDirection) => {
            if (!playersMap || !userIdRef.current || !enabled) return;

            //console.log("delta", delta);

            const currentData = getPlayerData(playersMap, userIdRef.current);
            if (!currentData) return;

            // 경계 체크가 있으면 적용
            const newPosition = boundary
                ? calculateNewPosition(
                      { x: currentData.x, y: currentData.y },
                      delta,
                      boundary
                  )
                : {
                      x: currentData.x + delta.dx,
                      y: currentData.y + delta.dy,
                  };

            // Yjs Map에 위치 및 방향 업데이트
            setPlayerData(playersMap, userIdRef.current, {
                x: newPosition.x,
                y: newPosition.y,
                direction: direction, // 방향 저장
                isMoving: true,
            });
        },
        [playersMap, boundary, enabled]
    );

    // 키 입력이 멈췄을 때(정지) 호출: 모션만 멈추고, 방향은 마지막 방향으로 유지
    const stopMyMotion = useCallback(
        (direction?: CharacterDirection) => {
            if (!playersMap || !userIdRef.current || !enabled) return;

            const currentData = getPlayerData(playersMap, userIdRef.current);
            if (!currentData) return;

            setPlayerData(playersMap, userIdRef.current, {
                isMoving: false,
                ...(direction ? { direction } : {}),
            });
        },
        [playersMap, enabled]
    );

    // 직접 위치 설정 함수
    const setMyPosition = useCallback(
        (position: PlayerPosition, direction?: CharacterDirection) => {
            if (!playersMap || !userIdRef.current || !enabled) return;

            // 경계 체크
            const finalPosition = boundary
                ? {
                      x: Math.max(
                          boundary.minX,
                          Math.min(boundary.maxX, position.x)
                      ),
                      y: Math.max(
                          boundary.minY,
                          Math.min(boundary.maxY, position.y)
                      ),
                  }
                : position;

            setPlayerData(playersMap, userIdRef.current, {
                x: finalPosition.x,
                y: finalPosition.y,
                ...(direction && { direction }), // 방향이 제공되면 저장
            });
        },
        [playersMap, boundary, enabled]
    );

    // Awareness에 유저 정보 설정
    useEffect(() => {
        if (!awareness || !userIdRef.current || !enabled) return;

        // Awareness에 내 유저 정보 설정
        awareness.setLocalStateField('user', {
            userId: userIdRef.current,
            isActive: true,
        });

        // Awareness 변경 감지 (다른 유저 정보)
        const handleAwarenessChange = () => {
            // 필요시 다른 유저의 Awareness 정보 처리
            // 예: 커서 위치, 온라인 상태 등
        };

        awareness.on('change', handleAwarenessChange);

        return () => {
            awareness.off('change', handleAwarenessChange);
            // 연결 해제 시 Awareness에서 제거
            awareness.setLocalStateField('user', null);
        };
    }, [awareness, enabled]);

    return {
        // 내 정보
        userId,
        myPlayer,

        // 모든 플레이어
        allPlayers,

        // 위치 업데이트 함수
        updateMyPosition,
        stopMyMotion,
        setMyPosition,

        // 내부 상태
        playersMap,
    };
}
