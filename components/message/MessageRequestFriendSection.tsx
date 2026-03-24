import type { SearchUserItem } from '@/lib/message/types';

type MessageRequestFriendSectionProps = {
    friends: SearchUserItem[];
    isFriendLoading?: boolean;
    isFriendLoadingMore?: boolean;
    hasMoreFriends?: boolean;
    friendErrorMessage?: string | null;
    isOpeningDm?: boolean;
    onLoadMoreFriends?: () => void;
    onOpenDm?: (user: SearchUserItem) => void;
};

export function MessageRequestFriendSection({
    friends,
    isFriendLoading,
    isFriendLoadingMore,
    hasMoreFriends,
    friendErrorMessage,
    isOpeningDm,
    onLoadMoreFriends,
    onOpenDm,
}: MessageRequestFriendSectionProps) {
    return (
        <>
            <h4 className='text-sm font-bold mb-2'>친구 목록에서 요청</h4>
            <div
                className='mb-4 max-h-[320px] space-y-2 overflow-y-auto pr-1 [scrollbar-color:rgba(148,163,184,0.45)_rgba(15,23,42,0.45)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-900/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/50 [&::-webkit-scrollbar-thumb:hover]:bg-slate-300/60'
                onScroll={(event) => {
                    if (
                        !onLoadMoreFriends ||
                        !hasMoreFriends ||
                        isFriendLoadingMore
                    ) {
                        return;
                    }
                    const target = event.currentTarget;
                    const reachedBottom =
                        target.scrollTop + target.clientHeight >=
                        target.scrollHeight - 24;
                    if (reachedBottom) onLoadMoreFriends();
                }}
            >
                {isFriendLoading && (
                    <div className='rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70'>
                        친구 목록 불러오는 중...
                    </div>
                )}
                {friendErrorMessage && (
                    <div className='rounded border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200'>
                        {friendErrorMessage}
                    </div>
                )}
                {friends.map((user) => (
                    <div
                        key={`friend-${user.id}`}
                        className='flex items-center justify-between rounded bg-white/5 px-3 py-2'
                    >
                        <div className='flex flex-col'>
                            <span className='text-sm font-semibold'>
                                {user.nickname}
                            </span>
                            <span className='text-[11px] text-white/60'>
                                @{user.username}
                            </span>
                        </div>
                        <button
                            type='button'
                            disabled={!!isOpeningDm}
                            onClick={() => onOpenDm?.(user)}
                            className='rounded bg-emerald-500/90 px-2 py-1 text-xs font-semibold hover:bg-emerald-400'
                        >
                            {isOpeningDm ? '열리는 중...' : '대화 열기'}
                        </button>
                    </div>
                ))}
                {!isFriendLoading && !friendErrorMessage && friends.length === 0 && (
                    <div className='rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60'>
                        친구 목록이 없습니다.
                    </div>
                )}
                {isFriendLoadingMore && (
                    <div className='rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70'>
                        친구 목록 더 불러오는 중...
                    </div>
                )}
            </div>
        </>
    );
}
