'use client';

import type { NotificationItem } from '@/stores/notificationsStore';

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

type NotificationPanelItemProps = {
    item: NotificationItem;
    isProcessing: boolean;
    onMarkRead: (id: string) => void;
    onRemove: (id: string) => void;
    onFriendAction: (
        notificationId: string,
        senderId: string,
        action: 'accept' | 'reject',
    ) => void;
};

export function NotificationPanelItem({
    item,
    isProcessing,
    onMarkRead,
    onRemove,
    onFriendAction,
}: NotificationPanelItemProps) {
    const isUnread = !item.read_at;
    const senderId = String(item.payload?.senderId ?? '');
    const senderNickname = String(item.payload?.senderNickname ?? '').trim();
    const isFriendRequest = item.type === 'FRIEND_REQUEST' && !!senderId;
    const canAct = isFriendRequest && !item.acted_at;
    const senderDisplayName =
        senderNickname || (senderId ? senderId.slice(0, 8) : '알 수 없음');

    return (
        <div
            onClick={() => {
                if (isUnread) onMarkRead(item.id);
            }}
            className={`w-full border-b border-white/5 px-4 py-3 text-left transition-colors ${
                isUnread ? 'bg-white/5 hover:bg-white/10' : 'hover:bg-white/5'
            }`}
        >
            <div className='mb-1 flex items-center gap-2'>
                <span className='rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold'>
                    {TYPE_LABEL[item.type] ?? item.type}
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
                        onRemove(item.id);
                    }}
                    className='ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70 hover:bg-white/20 hover:text-white'
                    aria-label='알림 삭제'
                >
                    삭제
                </button>
            </div>
            <div className='text-sm font-semibold text-white'>{item.title}</div>
            {isFriendRequest && (
                <div className='mt-1 text-xs text-cyan-300'>
                    보낸 사람: {senderDisplayName}
                </div>
            )}
            {item.body && (
                <div className='mt-1 text-xs text-white/70'>{item.body}</div>
            )}
            {canAct && (
                <div className='mt-2 flex gap-2'>
                    <button
                        type='button'
                        disabled={isProcessing}
                        onClick={(event) => {
                            event.stopPropagation();
                            onFriendAction(item.id, senderId, 'accept');
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
                            onFriendAction(item.id, senderId, 'reject');
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
}
