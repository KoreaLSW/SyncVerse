// components/WhiteboardChannelView.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useUsers } from '@/hooks/useUsers';
import { apiClient } from '@/lib/api';
import { WhiteboardCanvas } from '@/components/WhiteboardCanvas';
import { ChatLog } from '@/components/ChatLog';
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
    const { getNickname } = useUsers();
    const [roomId, setRoomId] = useState<string>('');
    const [isRoomLoading, setIsRoomLoading] = useState(true);

    const roomName = useMemo(() => channelId, [channelId]);

    useEffect(() => {
        if (!user) loginAsGuest();
    }, [user, loginAsGuest]);

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

            {!isRoomLoading && roomId && (
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
