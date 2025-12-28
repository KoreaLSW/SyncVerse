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
import { useAuthStore } from '../stores/authStore';

interface MapCanvasProps {
    docName?: string; // Yjs 문서 이름 (방/채널 이름)
    className?: string;
}

export function MapCanvas({
    docName = 'main-map',
    className = '',
}: MapCanvasProps) {
    const router = useRouter(); // 추가
    const yjsState = useYjs(docName);
    const { getNickname } = useUsers(); // SWR hook 사용
    // 게임 영역 크기 관리
    const canvasRef = useRef<HTMLDivElement>(null);
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
    const { userId, myPlayer, allPlayers, updateMyPosition, stopMyMotion } =
        usePlayerPosition({
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
            // delta와 direction을 updateMyPosition에 전달
            // useKeyboardMovement에서 계산된 방향이 자동으로 전달됨
            updateMyPosition(delta, direction);
        },
        onStop: (direction) => {
            stopMyMotion(direction);
        },
    });

    // 연결 상태 표시
    const isConnected = !!yjsState;

    // 플레이어 목록에 닉네임 미리 매핑 (성능 최적화)
    const playersWithNicknames = useMemo(() => {
        return allPlayers.map((player) => ({
            ...player,
            nickname: player.email ? getNickname(player.email) : undefined,
        }));
    }, [allPlayers, getNickname]);

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
                        플레이어: {allPlayers.length}명
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
                {isConnected && playersWithNicknames.length > 0 && (
                    <div className='absolute inset-0'>
                        {playersWithNicknames.map((player) => (
                            <Character
                                key={player.id}
                                player={player}
                                isMe={player.id === userId}
                                size={64}
                                nickname={player.nickname}
                            />
                        ))}
                    </div>
                )}

                {/* 초기 로딩 상태 */}
                {isConnected && allPlayers.length === 0 && (
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
