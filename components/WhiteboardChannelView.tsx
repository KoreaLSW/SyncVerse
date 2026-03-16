// components/WhiteboardChannelView.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useFriendsStore } from '@/stores/friendsStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { useUsers } from '@/hooks/useUsers';
import { apiClient } from '@/lib/api';
import { WhiteboardCanvas } from '@/components/WhiteboardCanvas';
import { ChatLog } from '@/components/ChatLog';
import { NotificationPanel } from '@/components/NotificationPanel';
import { MAX_USERS_PER_CHANNEL } from '@/lib/whiteboardChannels';

type WhiteboardChannelViewProps = {
    channelId: string;
};

type ChatRoom = {
    id: string;
};

const getSenderName = (
    user: ReturnType<typeof useAuthStore.getState>['user'],
    getNickname: (email: string) => string | undefined
) => {
    if (!user) return '익명';
    if (user.authType === 'google') {
        if (user.email) {
            return (
                getNickname(user.email) ||
                user.nickname ||
                user.name ||
                user.username ||
                '익명'
            );
        }
        return user.nickname || user.name || user.username || '익명';
    }
    return user.nickname || user.name || user.userId?.slice(0, 8) || '익명';
};

export function WhiteboardChannelView({
    channelId,
}: WhiteboardChannelViewProps) {
    const router = useRouter();
    const { user, loginAsGuest } = useAuthStore();
    const { init: initFriends, reset: resetFriends } = useFriendsStore();
    const { init: initNotifications, reset: resetNotifications } =
        useNotificationsStore();
    const { getNickname } = useUsers();
    const [roomId, setRoomId] = useState<string>('');
    const [isRoomLoading, setIsRoomLoading] = useState(true);
    const [isRoomJoined, setIsRoomJoined] = useState(false);

    const roomName = useMemo(() => channelId, [channelId]);

    useEffect(() => {
        if (!user) loginAsGuest();
    }, [user, loginAsGuest]);

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

    useEffect(() => {
        if (!user || user.authType === 'guest') {
            resetNotifications();
            return;
        }

        initNotifications(user.userId, false);

        return () => {
            resetNotifications();
        };
    }, [user, initNotifications, resetNotifications]);

    useEffect(() => {
        let isActive = true;

        const ensureRoom = async () => {
            setIsRoomLoading(true);
            try {
                const res = await apiClient.get('/api/chat/rooms', {
                    params: {
                        category: 'WHITEBOARD',
                        name: roomName,
                    },
                });
                const room: ChatRoom | null = res.data.data;

                if (!room) {
                    const createRes = await apiClient.post('/api/chat/rooms', {
                        type: 'SYSTEM',
                        category: 'WHITEBOARD',
                        name: roomName,
                        max_capacity: MAX_USERS_PER_CHANNEL,
                    });
                    if (!isActive) return;
                    setRoomId(createRes.data.data.id);
                } else {
                    if (!isActive) return;
                    setRoomId(room.id);
                }
            } catch (error) {
                console.error('화이트보드 채팅방 로드 실패:', error);
            } finally {
                if (isActive) setIsRoomLoading(false);
            }
        };

        ensureRoom();
        return () => {
            isActive = false;
        };
    }, [roomName]);

    useEffect(() => {
        let isActive = true;
        const joinRoom = async () => {
            if (!roomId || !user?.userId || user.authType === 'guest') {
                if (isActive) setIsRoomJoined(false);
                return;
            }
            try {
                await apiClient.post(`/api/chat/rooms/${roomId}/join`);
                if (isActive) setIsRoomJoined(true);
            } catch (error) {
                console.error('화이트보드 채팅방 참가 실패:', error);
                if (isActive) setIsRoomJoined(false);
            }
        };
        joinRoom();
        return () => {
            isActive = false;
        };
    }, [roomId, user?.authType, user?.userId]);

    const handleSendMessage = async (content: string) => {
        if (!roomId || !content.trim()) return;

        const currentUser =
            user ?? useAuthStore.getState().loginAsGuest();

        await apiClient.post('/api/chat/messages', {
            room_id: roomId,
            sender_id: currentUser.userId,
            sender_name: getSenderName(currentUser, getNickname),
            content: content.trim(),
        });
    };

    return (
        <div className='relative w-full h-screen'>
            <WhiteboardCanvas channelId={channelId} />
            <button
                type='button'
                onClick={() => {
                    if (window.history.length > 1) {
                        router.back();
                        return;
                    }
                    router.push('/whiteboard');
                }}
                className='absolute top-4 left-4 z-50 rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-sm text-white backdrop-blur-md transition hover:bg-black/80'
            >
                ← 채널 목록으로
            </button>
            <div className='absolute top-4 right-4 z-50'>
                <NotificationPanel />
            </div>

            {!isRoomLoading && roomId && isRoomJoined && (
                <div className='absolute bottom-6 left-4 z-50 w-140'>
                    <ChatLog
                        roomId={roomId}
                        onSendMessage={handleSendMessage}
                    />
                </div>
            )}
        </div>
    );
}
