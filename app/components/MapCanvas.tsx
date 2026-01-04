// MapCanvas.tsx
'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useYjs } from '@/app/hooks/useYjs';
import { usePlayerPosition } from '@/app/hooks/usePlayerPosition';
import {
    useKeyboardMovement,
    type Boundary,
} from '@/app/hooks/useKeyboardMovement';
import { Character } from './Character';
import { useUsers } from '../hooks/useUsers';
import { Player } from '../lib/types';
import { savePlayerPosition } from '@/app/lib/userUtils';
import { useAuthStore } from '../stores/authStore';
import { CharacterSetupButton } from './CharacterSetupButton';
import { LoginButton } from './LoginButton';

interface MapCanvasProps {
    docName?: string;
    className?: string;
}

type PlayerMetadata = {
    id: string;
    userId: string;
    direction: string;
    isMoving: boolean;
    headColor: string;
    bodyColor: string;
    email?: string;
    nickname?: string;
};

// 🚀 고정된 맵 크기 설정
const MAP_WIDTH = 1500;
const MAP_HEIGHT = 1500;

export function MapCanvas({
    docName = 'main-map',
    className = '',
}: MapCanvasProps) {
    const { user } = useAuthStore();
    const yjsState = useYjs(docName);
    const { getNickname } = useUsers();

    const viewportRef = useRef<HTMLDivElement>(null);
    const worldRef = useRef<HTMLDivElement>(null);

    // 🚀 각 플레이어의 DOM 요소를 저장
    const playerElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // 🚀 메타데이터 상태 관리 (리렌더링 최소화)
    const playersMetadataRef = useRef<Map<string, PlayerMetadata>>(new Map());
    const [metadataVersion, setMetadataVersion] = useState(0);

    // 🚀 맵 경계는 이제 고정값입니다.
    const [boundary] = useState<Boundary>({
        minX: 0,
        maxX: MAP_WIDTH,
        minY: 0,
        maxY: MAP_HEIGHT,
    });

    // 🚀 allPlayers는 리렌더링을 유발하므로 여기서 꺼내지 않거나 무시합니다.
    const { userId, myPlayer, updateMyPosition, stopMyMotion, playersMap } =
        usePlayerPosition({
            ydoc: yjsState?.ydoc ?? null,
            awareness: yjsState?.awareness ?? null,
            boundary,
            enabled: !!yjsState,
        });

    // 🚀 키보드 이동 처리
    useKeyboardMovement({
        enabled: !!yjsState && !!myPlayer,
        speed: 20,
        boundary,
        onMove: updateMyPosition,
        onStop: stopMyMotion,
    });

    // 🚀 브라우저 종료 시 좌표 저장
    useEffect(() => {
        // 게스트 사용자는 DB에 저장하지 않음 (username이 없음)
        if (!user?.username || !playersMap) return;

        const handleBeforeUnload = () => {
            const myData = playersMap.get(user.userId);
            if (myData && myData.x != null && myData.y != null) {
                // 🚀 중요: API 엔드포인트를 [username] 기반으로 수정
                const url = `/api/users/${user.username}`;

                // sendBeacon은 보통 POST를 권장하지만, Next.js PATCH 핸들러가
                // 텍스트 데이터를 처리할 수 있도록 설정을 확인해야 합니다.
                // 여기서는 안전하게 JSON 문자열로 변환하여 보냅니다.
                const data = JSON.stringify({
                    position_x: myData.x,
                    position_y: myData.y,
                });

                const blob = new Blob([data], { type: 'application/json' });
                navigator.sendBeacon(url, blob);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                const myData = playersMap.get(user.userId);
                if (myData && myData.x != null && myData.y != null) {
                    // 🚀 username 사용
                    savePlayerPosition(user.username, myData.x, myData.y);
                }
            }
        });

        // // 주기적으로 좌표 저장 (5초마다)
        // const saveInterval = setInterval(() => {
        //     const myData = playersMap.get(user.userId);
        //     if (myData && myData.x != null && myData.y != null) {
        //         const currentPos = { x: myData.x, y: myData.y };
        //         const lastPos = lastSavedPositionRef.current;

        //         if (
        //             !lastPos ||
        //             Math.abs(lastPos.x - currentPos.x) > 10 ||
        //             Math.abs(lastPos.y - currentPos.y) > 10
        //         ) {
        //             // 🚀 username 사용
        //             savePlayerPosition(
        //                 user.username,
        //                 currentPos.x,
        //                 currentPos.y
        //             );
        //             lastSavedPositionRef.current = currentPos;
        //         }
        //     }
        // }, 5000);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // clearInterval은 주석 처리된 코드에서만 필요하므로 제거

            const myData = playersMap.get(user.userId);
            if (myData && myData.x != null && myData.y != null) {
                // 🚀 username 사용
                savePlayerPosition(user.username, myData.x, myData.y);
            }
        };
    }, [user?.username, user?.userId, playersMap]);

    // 🚀 Yjs Map 직접 관찰: 메타데이터 변경 시에만 리렌더링 트리거
    useEffect(() => {
        if (!playersMap) return;

        const handleMapChange = () => {
            let hasMetadataChanged = false;
            const current = new Map<string, PlayerMetadata>();

            playersMap.forEach((playerData, id) => {
                const existing = playersMetadataRef.current.get(id);
                const metadata: PlayerMetadata = {
                    id,
                    userId: playerData.userId,
                    direction: playerData.direction || 'down',
                    isMoving: !!playerData.isMoving,
                    headColor: playerData.headColor,
                    bodyColor: playerData.bodyColor,
                    email: playerData.email || '',
                    nickname: playerData.email
                        ? getNickname(playerData.email) || ''
                        : '',
                };

                // 🚀 모든 필드를 엄격하게 비교
                if (
                    !existing ||
                    existing.direction !== metadata.direction ||
                    existing.isMoving !== metadata.isMoving ||
                    existing.headColor !== metadata.headColor ||
                    existing.bodyColor !== metadata.bodyColor ||
                    existing.email !== metadata.email ||
                    existing.nickname !== metadata.nickname
                ) {
                    current.set(id, metadata);
                    hasMetadataChanged = true;
                } else {
                    current.set(id, existing);
                }
            });

            if (
                hasMetadataChanged ||
                playersMetadataRef.current.size !== current.size
            ) {
                playersMetadataRef.current = current;
                setMetadataVersion((v) => v + 1); // 🚀 실제로 리렌더링을 트리거하는 유일한 곳
            }
        };

        playersMap.observe(handleMapChange);
        handleMapChange();

        return () => playersMap.unobserve(handleMapChange);
    }, [playersMap, getNickname]);

    // 🚀 리렌더링 시 사용할 안정적인 메타데이터 목록
    const stablePlayersMetadata = useMemo(() => {
        return Array.from(playersMetadataRef.current.values());
    }, [metadataVersion]);

    // 🚀 requestAnimationFrame으로 좌표 업데이트 및 카메라 팔로우
    useEffect(() => {
        if (!playersMap || !userId) return;

        let animationFrameId: number;
        const update = () => {
            // 1. 모든 플레이어 위치 업데이트
            playersMap.forEach((playerData, id) => {
                const element = playerElementRefs.current.get(id);
                if (element && playerData) {
                    // 🚀 GPU 가속을 위해 translate3d 사용
                    element.style.transform = `translate3d(${playerData.x}px, ${playerData.y}px, 0) translate(-50%, -50%)`;
                }
            });

            // 2. 카메라 팔로우 (내 캐릭터 기준)
            const me = playersMap.get(userId);
            if (me && worldRef.current && viewportRef.current) {
                const vWidth = viewportRef.current.offsetWidth;
                const vHeight = viewportRef.current.offsetHeight;

                // 내 위치가 화면 중앙에 오도록 계산
                const camX = vWidth / 2 - me.x;
                const camY = vHeight / 2 - me.y;

                // 월드 맵의 배경이 이동
                worldRef.current.style.transform = `translate3d(${camX}px, ${camY}px, 0)`;
            }

            animationFrameId = requestAnimationFrame(update);
        };
        animationFrameId = requestAnimationFrame(update);

        return () => cancelAnimationFrame(animationFrameId);
    }, [playersMap, userId]);

    const isConnected = !!yjsState;

    return (
        <div className={`relative w-full h-full overflow-hidden ${className}`}>
            {/* 뷰포트: 화면에 보이는 영역 */}
            <div
                ref={viewportRef}
                className='relative w-full h-full bg-slate-900'
                style={{ minHeight: '100vh' }}
            >
                {/* 월드: 실제 맵 데이터가 존재하는 넓은 공간 */}
                <div
                    ref={worldRef}
                    className='absolute top-0 left-0 transition-none'
                    style={{
                        width: `${MAP_WIDTH}px`,
                        height: `${MAP_HEIGHT}px`,
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        boxSizing: 'border-box',
                        backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
        `,
                        backgroundSize: '100px 100px',
                    }}
                >
                    {isConnected &&
                        stablePlayersMetadata.map((playerMeta) => {
                            const initialData = playersMap?.get(playerMeta.id);
                            return (
                                <Character
                                    key={playerMeta.id}
                                    ref={(el) => {
                                        if (el)
                                            playerElementRefs.current.set(
                                                playerMeta.id,
                                                el
                                            );
                                        else
                                            playerElementRefs.current.delete(
                                                playerMeta.id
                                            );
                                    }}
                                    player={
                                        {
                                            ...playerMeta,
                                            x: initialData?.x ?? 0,
                                            y: initialData?.y ?? 0,
                                        } as Player
                                    }
                                    isMe={playerMeta.id === userId}
                                    nickname={playerMeta.nickname}
                                />
                            );
                        })}
                </div>

                {/* UI 요소들 (뷰포트 상단에 고정) */}
                <div className='absolute top-4 left-4 z-20 flex gap-2'>
                    <div
                        className={`px-3 py-1 rounded text-sm text-white ${
                            isConnected ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                    >
                        {isConnected ? '연결됨' : '연결 중...'}
                    </div>
                    <div className='bg-black/50 text-white px-3 py-1 rounded text-sm'>
                        플레이어: {stablePlayersMetadata.length}명
                    </div>
                </div>

                {/* 하단 컨트롤 영역 */}
                <div className='absolute bottom-4 right-4 z-30 flex gap-2'>
                    <LoginButton />
                    <CharacterSetupButton />
                </div>
            </div>
        </div>
    );
}
