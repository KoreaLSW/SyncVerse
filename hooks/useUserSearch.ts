import { useEffect, useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';
import { searchUsers } from '@/lib/message/users';
import type { SearchUserItem } from '@/lib/message/types';

type UseUserSearchOptions = {
    debounceMs?: number;
    limit?: number;
};

export function useUserSearch(
    keyword: string,
    options?: UseUserSearchOptions,
) {
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const debounceMs = options?.debounceMs ?? 250;
    const limit = options?.limit ?? 10;

    useEffect(() => {
        const trimmedKeyword = keyword.trim();
        const timeoutId = window.setTimeout(() => {
            setDebouncedKeyword(trimmedKeyword);
        }, debounceMs);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [keyword, debounceMs]);

    const swrKey = useMemo(
        () =>
            debouncedKeyword
                ? (['message-user-search', debouncedKeyword] as const)
                : null,
        [debouncedKeyword],
    );

    const { data, error, isValidating, size, setSize } = useSWRInfinite(
        (pageIndex: number, previousPageData?: { hasMore: boolean }) => {
            if (!swrKey) return null;
            if (previousPageData && !previousPageData.hasMore) return null;
            return ['message-user-search-page', swrKey[1], pageIndex] as const;
        },
        ([, searchKeyword, pageIndex]) =>
            searchUsers({
                keyword: String(searchKeyword),
                limit,
                offset: Number(pageIndex) * limit,
            }),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: false,
        },
    );

    const searchedUsers = useMemo<SearchUserItem[]>(
        () => data?.flatMap((page) => page.users) ?? [],
        [data],
    );
    const hasMore =
        data && data.length > 0 ? data[data.length - 1].hasMore : false;
    const isLoading = !!debouncedKeyword && !data && isValidating;
    const isLoadingMore =
        !!debouncedKeyword && isValidating && !!data && hasMore;
    const loadMore = () => {
        if (!hasMore || isLoadingMore || !debouncedKeyword) return;
        setSize((prev) => prev + 1);
    };

    const errorMessage = error
        ? '유저 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.'
        : null;

    return {
        searchedUsers,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore,
        error,
        errorMessage,
    };
}
