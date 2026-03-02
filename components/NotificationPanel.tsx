'use client';

import { useMemo, useState } from 'react';
import { acceptFriend, removeFriend } from '@/lib/friends';
import { useNotificationsStore } from '@/stores/notificationsStore';

const TYPE_LABEL: Record<string, string> = {
    FRIEND_REQUEST: '친구 요청',
    MESSAGE_REQUEST: '메시지 요청',
    SYSTEM: '시스템',
    ETC: '알림',
};

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function NotificationPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const notifications = useNotificationsStore((state) => state.notifications);
    const unreadCount = useNotificationsStore((state) => state.unreadCount);
    const isLoading = useNotificationsStore((state) => state.isLoading);
    const markRead = useNotificationsStore((state) => state.markRead);
    const markAllRead = useNotificationsStore((state) => state.markAllRead);
    const markActed = useNotificationsStore((state) => state.markActed);
    const removeNotification = useNotificationsStore(
        (state) => state.removeNotification,
    );
    const clearReadNotifications = useNotificationsStore(
        (state) => state.clearReadNotifications,
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
                            latestNotifications.map((item) => {
                                const isUnread = !item.read_at;
                                const senderId = String(
                                    item.payload?.senderId ?? '',
                                );
                                const senderNickname = String(
                                    item.payload?.senderNickname ?? '',
                                ).trim();
                                const isFriendRequest =
                                    item.type === 'FRIEND_REQUEST' && !!senderId;
                                const canAct = isFriendRequest && !item.acted_at;
                                const isProcessing = processingId === item.id;
                                const senderDisplayName =
                                    senderNickname ||
                                    (senderId ? senderId.slice(0, 8) : '알 수 없음');
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => {
                                            if (isUnread) {
                                                markRead(item.id);
                                            }
                                        }}
                                        className={`w-full border-b border-white/5 px-4 py-3 text-left transition-colors ${
                                            isUnread
                                                ? 'bg-white/5 hover:bg-white/10'
                                                : 'hover:bg-white/5'
                                        }`}
                                    >
                                        <div className='mb-1 flex items-center gap-2'>
                                            <span className='rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold'>
                                                {TYPE_LABEL[item.type] ??
                                                    item.type}
                                            </span>
                                            <span className='text-[11px] text-white/50'>
                                                {formatDate(item.created_at)}
                                            </span>
                                            {isUnread && (
                                                <span className='ml-auto rounded bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white'>
                                                    NEW
                                                </span>
                                            )}
                                            <button
                                                type='button'
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    removeNotification(item.id);
                                                }}
                                                className='ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70 hover:bg-white/20 hover:text-white'
                                                aria-label='알림 삭제'
                                            >
                                                삭제
                                            </button>
                                        </div>
                                        <div className='text-sm font-semibold text-white'>
                                            {item.title}
                                        </div>
                                        {isFriendRequest && (
                                            <div className='mt-1 text-xs text-cyan-300'>
                                                보낸 사람: {senderDisplayName}
                                            </div>
                                        )}
                                        {item.body && (
                                            <div className='mt-1 text-xs text-white/70'>
                                                {item.body}
                                            </div>
                                        )}
                                        {canAct && (
                                            <div className='mt-2 flex gap-2'>
                                                <button
                                                    type='button'
                                                    disabled={isProcessing}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleFriendAction(
                                                            item.id,
                                                            senderId,
                                                            'accept',
                                                        );
                                                    }}
                                                    className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                                                        isProcessing
                                                            ? 'cursor-not-allowed bg-emerald-500/30 text-white/60'
                                                            : 'bg-emerald-500/90 text-white hover:bg-emerald-500'
                                                    }`}
                                                >
                                                    수락
                                                </button>
                                                <button
                                                    type='button'
                                                    disabled={isProcessing}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        handleFriendAction(
                                                            item.id,
                                                            senderId,
                                                            'reject',
                                                        );
                                                    }}
                                                    className={`rounded px-2 py-1 text-xs font-semibold transition-colors ${
                                                        isProcessing
                                                            ? 'cursor-not-allowed bg-white/10 text-white/50'
                                                            : 'bg-white/10 text-white/80 hover:bg-white/20'
                                                    }`}
                                                >
                                                    거절
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
