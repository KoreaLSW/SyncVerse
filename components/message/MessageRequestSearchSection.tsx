import type { SearchUserItem } from '@/lib/message/types';

type MessageRequestSearchSectionProps = {
    searchKeyword: string;
    searchedUsers: SearchUserItem[];
    isSearchLoading?: boolean;
    isSearchLoadingMore?: boolean;
    hasMoreSearchedUsers?: boolean;
    searchErrorMessage?: string | null;
    friendIds?: string[];
    isRequestingDm?: boolean;
    isOpeningDm?: boolean;
    onSearchChange: (value: string) => void;
    onRequestDm?: (receiverId: string) => void;
    onOpenDm?: (user: SearchUserItem) => void;
    onLoadMoreSearchedUsers?: () => void;
};

export function MessageRequestSearchSection({
    searchKeyword,
    searchedUsers,
    isSearchLoading,
    isSearchLoadingMore,
    hasMoreSearchedUsers,
    searchErrorMessage,
    friendIds,
    isRequestingDm,
    isOpeningDm,
    onSearchChange,
    onRequestDm,
    onOpenDm,
    onLoadMoreSearchedUsers,
}: MessageRequestSearchSectionProps) {
    const friendIdSet = new Set(friendIds ?? []);
    const shouldShowSearchList =
        searchKeyword.trim().length > 0 ||
        !!isSearchLoading ||
        !!isSearchLoadingMore ||
        !!searchErrorMessage;

    return (
        <>
            <h3 className='text-sm font-bold mb-2'>1:1 대화 요청</h3>
            <div className='mb-3'>
                <input
                    value={searchKeyword}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder='유저 검색'
                    className='w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-blue-400/70'
                />
            </div>
            <div className='relative mb-4'>
                {shouldShowSearchList && (
                    <div
                        className='absolute left-0 right-0 top-0 z-20 max-h-[320px] space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-md [scrollbar-color:rgba(148,163,184,0.45)_rgba(15,23,42,0.45)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-900/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/50 [&::-webkit-scrollbar-thumb:hover]:bg-slate-300/60'
                        onScroll={(event) => {
                            if (
                                !onLoadMoreSearchedUsers ||
                                !hasMoreSearchedUsers ||
                                isSearchLoadingMore
                            ) {
                                return;
                            }
                            const target = event.currentTarget;
                            const reachedBottom =
                                target.scrollTop + target.clientHeight >=
                                target.scrollHeight - 24;
                            if (reachedBottom) onLoadMoreSearchedUsers();
                        }}
                    >
                        {isSearchLoading && (
                            <div className='rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70'>
                                유저 검색 중...
                            </div>
                        )}
                        {searchErrorMessage && (
                            <div className='rounded border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200'>
                                {searchErrorMessage}
                            </div>
                        )}
                        {searchedUsers.map((user) => (
                            <div
                                key={`search-${user.id}`}
                                className='flex items-center justify-between rounded bg-white/5 px-3 py-2'
                            >
                                <div className='flex flex-col'>
                                    <div className='flex items-center gap-1.5'>
                                        <span className='text-sm font-semibold'>
                                            {user.nickname}
                                        </span>
                                        {friendIdSet.has(user.id) && (
                                            <span className='rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white'>
                                                친구
                                            </span>
                                        )}
                                    </div>
                                    <span className='text-[11px] text-white/60'>
                                        @{user.username}
                                    </span>
                                </div>
                                <button
                                    type='button'
                                    disabled={!!isRequestingDm || !!isOpeningDm}
                                    onClick={() => {
                                        if (friendIdSet.has(user.id)) {
                                            onOpenDm?.(user);
                                            return;
                                        }
                                        onRequestDm?.(user.id);
                                    }}
                                    className='rounded bg-blue-500/90 px-2 py-1 text-xs font-semibold hover:bg-blue-400'
                                >
                                    {friendIdSet.has(user.id)
                                        ? isOpeningDm
                                            ? '열리는 중...'
                                            : '대화 열기'
                                        : isRequestingDm
                                          ? '요청 중...'
                                          : '1:1 요청'}
                                </button>
                            </div>
                        ))}
                        {!isSearchLoading &&
                            !searchErrorMessage &&
                            searchedUsers.length === 0 &&
                            searchKeyword.trim().length > 0 && (
                                <div className='rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60'>
                                    검색 결과가 없습니다.
                                </div>
                            )}
                        {isSearchLoadingMore && (
                            <div className='rounded border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70'>
                                검색 결과 더 불러오는 중...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
