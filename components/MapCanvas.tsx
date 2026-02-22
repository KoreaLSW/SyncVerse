// MapCanvas.tsx
'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // 🚀 useRouter 추가
import { useYjs } from '@/hooks/useYjs';
import { usePlayerPosition } from '@/hooks/usePlayerPosition';
import {
    useKeyboardMovement,
    type Boundary,
} from '@/hooks/useKeyboardMovement';
import { Character } from './Character';
import { useUsers } from '../hooks/useUsers';
import { Player } from '../lib/types';
import { savePlayerPosition } from '@/lib/userUtils';
import { useAuthStore } from '../stores/authStore';
import { CharacterSetupButton } from './CharacterSetupButton';
import { LoginButton } from './LoginButton';
import { ChatLog } from './ChatLog';
import { OnlineUsersPanel } from './OnlineUsersPanel';
import { CharacterContextMenu } from './CharacterContextMenu';
import { MapObject } from './MapObject'; // 🚀 추가
import { useChat } from '../hooks/useChat';
import { getFriendActionLabel } from '@/lib/friends';
import { apiClient } from '../lib/api'; // 🚀 추가
import { useFriendship } from '@/hooks/useFriendship';
import { useLocationTrigger } from '../hooks/useLocationTrigger';
import { TRIGGER_ZONES } from '@/lib/mapConfig';
import { useFriendsStore } from '@/stores/friendsStore';

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
    message?: string; // 🚀 메시지 추가
};

// 🚀 고정된 맵 크기 설정
const MAP_WIDTH = 1500;
const MAP_HEIGHT = 1500;

export function MapCanvas({
    docName = 'main-map',
    className = '',
}: MapCanvasProps) {
    const router = useRouter(); // 🚀 router 초기화
    const { user, updateUser } = useAuthStore();
    const yjsState = useYjs(docName);
    const { getNickname } = useUsers();
    const { init: initFriends, reset: resetFriends } = useFriendsStore();
    const friendsSet = useFriendsStore((state) => state.friendsSet);

    // 🚀 캐릭터 로딩 상태 관리
    const [isCharacterLoaded, setIsCharacterLoaded] = useState(false);

    // 🚀 캐릭터 로딩 완료 핸들러
    const handleCharacterLoaded = useCallback(() => {
        setIsCharacterLoaded(true);
    }, []);

    // 🚀 메인 광장 Room ID 관리 (실제 구현 시에는 API를 통해 'MAIN' 카테고리 방 ID를 가져와야 함)
    // 지금은 임시로 고정 ID를 사용하거나, 추후 방 정보를 가져오는 로직을 추가할 수 있습니다.
    const [mainRoomId, setMainRoomId] = useState<string>('');

    // 🚀 채팅 훅 연결
    const { sendMessage: saveMessageToDB } = useChat(mainRoomId);

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

    // 🚀 위치 감지 시작 (외부 설정 사용)
    const activeZoneId = useLocationTrigger(
        myPlayer?.x || 0,
        myPlayer?.y || 0,
        TRIGGER_ZONES,
    );

    // 🚀 Space 키 입력 시 페이지 이동 처리
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && activeZoneId) {
                e.preventDefault(); // 스크롤 방지
                const zone = TRIGGER_ZONES.find((z) => z.id === activeZoneId);
                if (zone && zone.pagePath) {
                    router.push(zone.pagePath);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeZoneId, router]);

    // 🚀 키보드 이동 처리
    useKeyboardMovement({
        enabled: !!yjsState && !!myPlayer,
        speed: 20,
        boundary,
        onMove: updateMyPosition,
        onStop: stopMyMotion,
    });

    // 🚀 친구 목록 캐시 + 리얼타임 구독 초기화
    useEffect(() => {
        if (!user || user.authType === 'guest') {
            resetFriends();
            return;
        }

        initFriends(user.userId, false);

        return () => {
            resetFriends();
        };
    }, [user, initFriends, resetFriends]);

    // 🚀 초기 로드 시 메인 광장 ID 가져오기
    useEffect(() => {
        const fetchMainRoom = async () => {
            try {
                const res = await apiClient.get(
                    '/api/chat/rooms?category=MAIN',
                );
                if (res.data.data) {
                    setMainRoomId(res.data.data.id);
                }
            } catch (err) {
                console.error('Failed to fetch main room:', err);
            }
        };
        fetchMainRoom();
    }, []);

    // 🚀 브라우저 종료 시 좌표 저장
    useEffect(() => {
        if (!user || !playersMap) return;

        const handleBeforeUnload = () => {
            const myData = playersMap.get(user.userId);
            if (myData && myData.x != null && myData.y != null) {
                // 1. 구글 사용자: DB 저장
                if (user.authType === 'google' && user.username) {
                    const url = `/api/users/${user.username}`;
                    const data = JSON.stringify({
                        position_x: myData.x,
                        position_y: myData.y,
                    });
                    const blob = new Blob([data], { type: 'application/json' });
                    navigator.sendBeacon(url, blob);
                }
                // 2. 게스트 사용자: LocalStorage 저장 (authStore 업데이트)
                else if (user.authType === 'guest') {
                    // 스토어 정보를 직접 업데이트 (persist 미들웨어가 localStorage에 저장)
                    useAuthStore.getState().updateUser({
                        lastX: myData.x,
                        lastY: myData.y,
                    });
                }
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                const myData = playersMap.get(user.userId);
                if (myData && myData.x != null && myData.y != null) {
                    if (user.authType === 'google' && user.username) {
                        savePlayerPosition(user.username, myData.x, myData.y);
                    } else if (user.authType === 'guest') {
                        updateUser({
                            lastX: myData.x,
                            lastY: myData.y,
                        });
                    }
                }
            }
        });

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);

            const myData = playersMap.get(user.userId);
            if (myData && myData.x != null && myData.y != null) {
                if (user.authType === 'google' && user.username) {
                    savePlayerPosition(user.username, myData.x, myData.y);
                } else if (user.authType === 'guest') {
                    updateUser({
                        lastX: myData.x,
                        lastY: myData.y,
                    });
                }
            }
        };
    }, [user, playersMap, updateUser]);

    // 🚀 메시지 전송 함수
    const handleSendMessage = async (content: string) => {
        if (!playersMap || !userId || !content.trim()) return;

        // 1. 실시간 말풍선 (Yjs) 업데이트
        const myData = playersMap.get(userId);
        if (myData) {
            playersMap.set(userId, {
                ...myData,
                message: content.trim(),
                messageTimestamp: Date.now(),
            });

            // 5초 후 메시지 자동 삭제
            setTimeout(() => {
                const currentData = playersMap.get(userId);
                if (currentData?.message === content.trim()) {
                    playersMap.set(userId, {
                        ...currentData,
                        message: '',
                        messageTimestamp: 0,
                    });
                }
            }, 5000);
        }

        // 2. DB에 메시지 저장 (API 호출)
        if (user && mainRoomId) {
            await saveMessageToDB({
                room_id: mainRoomId,
                sender_id: user.userId,
                sender_name: user.name || '익명',
                content: content.trim(),
            });
        }
    };

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
                    message: playerData.message || '', // 🚀 메시지 필드 추가
                };

                // 🚀 모든 필드를 엄격하게 비교
                if (
                    !existing ||
                    existing.direction !== metadata.direction ||
                    existing.isMoving !== metadata.isMoving ||
                    existing.headColor !== metadata.headColor ||
                    existing.bodyColor !== metadata.bodyColor ||
                    existing.email !== metadata.email ||
                    existing.nickname !== metadata.nickname ||
                    existing.message !== metadata.message // 🚀 메시지 비교 추가
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
    const isLoading = !isConnected || !isCharacterLoaded;
    const {
        contextMenu,
        openContextMenu,
        closeContextMenu,
        handleFriendAction,
    } = useFriendship(user);

    const handleCharacterContextMenu = useCallback(
        (
            event: React.MouseEvent<HTMLDivElement>,
            playerMeta: PlayerMetadata
        ) => {
            if (playerMeta.id === userId) return;
            openContextMenu(event, playerMeta.id, playerMeta.nickname);
        },
        [userId, openContextMenu]
    );

    return (
        <div className={`relative w-full h-full overflow-hidden ${className}`}>
            {/* 🚀 로딩 오버레이 */}
            {isLoading && (
                <div className='absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900 text-white'>
                    {/* 로딩 스피너 */}
                    <div className='w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4' />
                    <p className='text-lg font-medium animate-pulse'>
                        {!isConnected
                            ? '서버에 연결 중...'
                            : '캐릭터 데이터를 불러오는 중...'}
                    </p>
                </div>
            )}

            {/* 뷰포트: 화면에 보이는 영역 */}
            <div
                ref={viewportRef}
                className='relative w-full h-full bg-slate-900'
                style={{ minHeight: '100vh' }}
                data-viewport
                onMouseDown={(event) => {
                    if (event.button === 0) {
                        closeContextMenu();
                    }
                }}
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
                    {/* 🚀 맵 트리거 구역의 오브젝트 렌더링 */}
                    {TRIGGER_ZONES.map((zone: any) => (
                        <MapObject
                            key={zone.id}
                            x={zone.x}
                            y={zone.y}
                            width={zone.width}
                            height={zone.height}
                            imagePath={zone.imagePath}
                        />
                    ))}

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
                                                el,
                                            );
                                        else
                                            playerElementRefs.current.delete(
                                                playerMeta.id,
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
                                    isFriend={
                                        playerMeta.id !== userId &&
                                        friendsSet.has(playerMeta.id)
                                    }
                                    nickname={playerMeta.nickname}
                                    isInZone={
                                        playerMeta.id === userId &&
                                        !!activeZoneId
                                    }
                                    onLoad={
                                        playerMeta.id === userId
                                            ? handleCharacterLoaded
                                            : undefined
                                    }
                                    onContextMenu={(event) =>
                                        handleCharacterContextMenu(
                                            event,
                                            playerMeta
                                        )
                                    }
                                />
                            );
                        })}
                </div>

                {contextMenu && (
                    <CharacterContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        nickname={contextMenu.nickname}
                        friendActionLabel={getFriendActionLabel(
                            contextMenu.friendStatus,
                            contextMenu.isFriendStatusLoading,
                            contextMenu.isTargetGuest
                        )}
                        friendActionDisabled={
                            contextMenu.isFriendStatusLoading ||
                            contextMenu.isTargetGuest ||
                            contextMenu.friendStatus === 'UNAVAILABLE' ||
                            contextMenu.friendStatus === 'ERROR'
                        }
                        onFriendAction={handleFriendAction}
                        onClose={closeContextMenu}
                    />
                )}

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

                {/* 접속자/채팅 패널 (왼쪽 하단 세로 정렬) */}
                {isConnected && (
                    <div className='absolute bottom-6 left-4 z-40 w-140 flex flex-col gap-3'>
                        {/* 현재 접속자 닉네임 목록 */}
                        <OnlineUsersPanel
                            users={stablePlayersMetadata}
                        />

                        {/* 🚀 채팅 통합 컴포넌트 */}
                        {mainRoomId && (
                            <div>
                                <ChatLog
                                    roomId={mainRoomId}
                                    onSendMessage={handleSendMessage}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* 하단 컨트롤 영역 */}
                <div className='absolute bottom-4 right-4 z-30 flex gap-2'>
                    <LoginButton />
                    <CharacterSetupButton />
                </div>
            </div>
        </div>
    );
}
