'use client';

import { useMemo, useState } from 'react';
import { acceptFriend, removeFriend } from '@/lib/friends';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { NotificationPanelItem } from '@/components/NotificationPanelItem';

export function NotificationPanel() {
    const [isOpen, setIsOpen] = useState(false); // 알림 패널 열림 상태
    const [processingId, setProcessingId] = useState<string | null>(null); // 처리 중인 알림 id
    const notifications = useNotificationsStore((state) => state.notifications); // 알림 목록
    const unreadCount = useNotificationsStore((state) => state.unreadCount); // 미읽음 알림 개수
    const isLoading = useNotificationsStore((state) => state.isLoading); // 알림 로딩 상태
    const markRead = useNotificationsStore((state) => state.markRead); // 알림 읽음 처리
    const markAllRead = useNotificationsStore((state) => state.markAllRead); // 모든 알림 읽음 처리
    const markActed = useNotificationsStore((state) => state.markActed); // 알림 액션 처리
    const removeNotification = useNotificationsStore(
        (state) => state.removeNotification, // 알림 삭제
    );
    const clearReadNotifications = useNotificationsStore(
        (state) => state.clearReadNotifications, // 읽은 알림 삭제
    );

    const latestNotifications = useMemo(
        () => notifications.slice(0, 20),
        [notifications],
    );

    const handleFriendAction = async (
        notificationId: string,
        senderId: string,
        action: 'accept' | 'reject',
    ) => {
        if (!senderId || processingId) return;
        try {
            setProcessingId(notificationId);
            if (action === 'accept') {
                await acceptFriend(senderId);
            } else {
                await removeFriend(senderId);
            }
            await markActed(notificationId);
        } catch (error) {
            console.error('친구 요청 알림 액션 실패:', error);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className='relative'>
            <button
                type='button'
                onClick={() => setIsOpen((prev) => !prev)}
                className='relative rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-sm text-white backdrop-blur-md transition hover:bg-black/80'
            >
                알림
                {unreadCount > 0 && (
                    <span className='ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white'>
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className='absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-black/85 text-white shadow-2xl backdrop-blur-md'>
                    <div className='flex items-center justify-between border-b border-white/10 px-3 py-2'>
                        <span className='text-sm font-semibold'>알림 센터</span>
                        <div className='flex items-center gap-2'>
                            <button
                                type='button'
                                onClick={clearReadNotifications}
                                className='text-xs text-white/60 transition-colors hover:text-white'
                            >
                                읽은 알림 삭제
                            </button>
                            <button
                                type='button'
                                onClick={markAllRead}
                                disabled={unreadCount === 0}
                                className={`text-xs transition-colors ${
                                    unreadCount === 0
                                        ? 'cursor-not-allowed text-white/30'
                                        : 'text-white/70 hover:text-white'
                                }`}
                            >
                                모두 읽음
                            </button>
                        </div>
                    </div>

                    <div className='max-h-96 overflow-y-auto'>
                        {isLoading ? (
                            <div className='px-4 py-5 text-center text-sm text-white/60'>
                                알림 불러오는 중...
                            </div>
                        ) : latestNotifications.length === 0 ? (
                            <div className='px-4 py-5 text-center text-sm text-white/60'>
                                알림이 없습니다.
                            </div>
                        ) : (
                            latestNotifications.map((item) => (
                                <NotificationPanelItem
                                    key={item.id}
                                    item={item}
                                    isProcessing={processingId === item.id}
                                    onMarkRead={markRead}
                                    onRemove={removeNotification}
                                    onFriendAction={handleFriendAction}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
