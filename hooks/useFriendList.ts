import { useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import { fetchFriendList } from '@/lib/message/friends';
import type { SearchUserItem } from '@/lib/message/types';

export function useFriendList() {
    const PAGE_SIZE = 10;
    const getKey = (
        pageIndex: number,
        previousPageData?: { hasMore: boolean },
    ) => {
        if (previousPageData && !previousPageData.hasMore) return null;
        return ['message-friend-list', pageIndex * PAGE_SIZE] as const;
    };

    const { data, error, isValidating, size, setSize } = useSWRInfinite(
        getKey,
        ([, offset]) =>
            fetchFriendList({
                limit: PAGE_SIZE,
                offset: Number(offset),
            }),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: false,
            persistSize: true,
        },
    );

    // 친구 목록
    const friends = useMemo<SearchUserItem[]>(
        () => data?.flatMap((page) => page.friends) ?? [],
        [data],
    );
    const friendIds = useMemo<string[]>(
        () => data?.[0]?.friendIds ?? [],
        [data],
    );
    // 더 불러올 친구가 있는지 여부
    const hasMore =
        data && data.length > 0 ? data[data.length - 1].hasMore : false;

    const isLoading = !data && isValidating;
    const isLoadingMore =
        isValidating && !!data && (hasMore || size > (data?.length ?? 0));
    const loadMore = () => {
        if (!hasMore || isLoadingMore) return;
        setSize((prev) => prev + 1);
    };

    return {
        friends,
        friendIds,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        error,
        errorMessage: error
            ? '친구 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
            : null,
    };
}
