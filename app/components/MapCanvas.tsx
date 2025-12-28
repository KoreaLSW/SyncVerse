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
import { useRouter } from 'next/navigation';
import { useUsers } from '../hooks/useUsers';
import { Player } from '../lib/types';

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

export function MapCanvas({
    docName = 'main-map',
    className = '',
}: MapCanvasProps) {
    const router = useRouter();
    const yjsState = useYjs(docName);
    const { getNickname } = useUsers();

    // 게임 영역 크기 관리
    const canvasRef = useRef<HTMLDivElement>(null);

    // 🚀 각 플레이어의 DOM 요소를 저장
    const playerElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    // 🚀 메타데이터를 useRef로 안정화 (좌표 제외)
    const playersMetadataRef = useRef<Map<string, PlayerMetadata>>(new Map());

    const [boundary, setBoundary] = useState<Boundary>({
        minX: 0,
        maxX: typeof window !== 'undefined' ? window.innerWidth : 1920,
        minY: 0,
        maxY: typeof window !== 'undefined' ? window.innerHeight : 1080,
    });

    // 화면 크기 변경 감지
    useEffect(() => {
        const updateBoundary = () => {
            if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                setBoundary({
                    minX: 0,
                    maxX: rect.width,
                    minY: 0,
                    maxY: rect.height,
                });
            }
        };

        updateBoundary();
        window.addEventListener('resize', updateBoundary);

        return () => {
            window.removeEventListener('resize', updateBoundary);
        };
    }, []);

    // 플레이어 위치 관리
    const {
        userId,
        myPlayer,
        allPlayers,
        updateMyPosition,
        stopMyMotion,
        playersMap,
    } = usePlayerPosition({
        ydoc: yjsState?.ydoc ?? null,
        awareness: yjsState?.awareness ?? null,
        boundary,
        enabled: !!yjsState,
    });

    // 키보드 입력 처리
    useKeyboardMovement({
        enabled: !!yjsState && !!myPlayer,
        speed: 5,
        boundary,
        onMove: (delta, direction) => {
            updateMyPosition(delta, direction);
        },
        onStop: (direction) => {
            stopMyMotion(direction);
        },
    });

    // 🚀 playersMap에서 직접 메타데이터만 추출 (allPlayers 사용 안 함!)
    const stablePlayersMetadata = useMemo(() => {
        if (!playersMap) return Array.from(playersMetadataRef.current.values());

        const current = new Map<string, PlayerMetadata>();

        playersMap.forEach((playerData, id) => {
            const existing = playersMetadataRef.current.get(id);
            const metadata: PlayerMetadata = {
                id,
                userId: playerData.userId,
                direction: playerData.direction || 'down',
                isMoving: playerData.isMoving || false,
                headColor: playerData.headColor,
                bodyColor: playerData.bodyColor,
                email: playerData.email,
                nickname: playerData.email
                    ? getNickname(playerData.email)
                    : undefined,
            };

            // 메타데이터가 변경되었거나 새 플레이어인 경우만 업데이트
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
            } else {
                // 메타데이터가 같으면 기존 참조 유지 (안정성!)
                current.set(id, existing);
            }
        });

        playersMetadataRef.current = current;
        return Array.from(current.values());
    }, [playersMap, getNickname]); // 🚀 allPlayers 대신 playersMap 사용!

    // 🚀 requestAnimationFrame으로 좌표만 직접 업데이트 (React 리렌더링 없음)
    useEffect(() => {
        if (!playersMap) return;

        let animationFrameId: number;

        const updatePositions = () => {
            // Yjs Map에서 직접 좌표 읽기 (React State 아님!)
            playersMap.forEach((playerData, userId) => {
                const element = playerElementRefs.current.get(userId);
                if (element && playerData) {
                    // DOM을 직접 수정 -> React 리렌더링 없음!
                    element.style.transform = `translate3d(${playerData.x}px, ${playerData.y}px, 0) translate(-50%, -50%)`;
                }
            });

            animationFrameId = requestAnimationFrame(updatePositions);
        };

        animationFrameId = requestAnimationFrame(updatePositions);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [playersMap]);

    // 연결 상태 표시
    const isConnected = !!yjsState;

    return (
        <div className={`relative w-full h-full ${className}`}>
            {/* 게임 캔버스 영역 */}
            <div
                ref={canvasRef}
                className='relative w-full h-full overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100'
                style={{ minHeight: '100vh' }}
            >
                {/* 연결 상태 표시 */}
                {!isConnected && (
                    <div className='absolute top-4 left-4 z-20 bg-yellow-500 text-white px-3 py-1 rounded text-sm'>
                        연결 중...
                    </div>
                )}

                {isConnected && (
                    <div className='absolute top-4 left-4 z-20 bg-green-500 text-white px-3 py-1 rounded text-sm'>
                        연결됨
                    </div>
                )}

                {/* 플레이어 수 표시 */}
                {isConnected && (
                    <div className='absolute top-4 right-4 z-20 bg-black/50 text-white px-3 py-1 rounded text-sm'>
                        플레이어: {stablePlayersMetadata.length}명
                    </div>
                )}

                {/* 캐릭터 수정 버튼 */}
                <button
                    onClick={() => router.push('/character-setup')}
                    className='absolute bottom-4 right-4 z-30 bg-black/60 text-white px-4 py-2 rounded-lg text-sm hover:bg-black/70 transition'
                >
                    캐릭터 수정
                </button>

                {/* 모든 플레이어 렌더링 */}
                {isConnected && stablePlayersMetadata.length > 0 && (
                    <div className='absolute inset-0'>
                        {stablePlayersMetadata.map((playerMeta) => {
                            // 초기 좌표 (playersMap에서 읽어옴, 이후엔 RAF가 덮어씀)
                            const playerData = playersMap?.get(playerMeta.id);

                            return (
                                <Character
                                    key={playerMeta.id}
                                    ref={(el) => {
                                        if (el) {
                                            playerElementRefs.current.set(
                                                playerMeta.id,
                                                el
                                            );
                                        } else {
                                            playerElementRefs.current.delete(
                                                playerMeta.id
                                            );
                                        }
                                    }}
                                    player={
                                        {
                                            ...playerMeta,
                                            x: playerData?.x ?? 0,
                                            y: playerData?.y ?? 0,
                                        } as Player
                                    }
                                    isMe={playerMeta.id === userId}
                                    size={64}
                                    nickname={playerMeta.nickname}
                                />
                            );
                        })}
                    </div>
                )}

                {/* 초기 로딩 상태 */}
                {isConnected && stablePlayersMetadata.length === 0 && (
                    <div className='absolute inset-0 flex items-center justify-center'>
                        <div className='text-gray-500'>
                            게임 영역에 입장했습니다
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
