import { apiClient } from '@/lib/api';
import type { SearchUserItem } from '@/lib/message/types';

type SearchUsersParams = {
    keyword: string;
    limit?: number;
    offset?: number;
};

type SearchUsersResponse = {
    data?: SearchUserItem[];
    hasMore?: boolean;
    nextOffset?: number;
};

export type SearchUsersPage = {
    users: SearchUserItem[];
    hasMore: boolean;
    nextOffset: number;
};

export async function searchUsers({
    keyword,
    limit = 10,
    offset = 0,
}: SearchUsersParams) {
    const response = await apiClient.get<SearchUsersResponse>('/api/users', {
        params: {
            q: keyword,
            limit,
            offset,
        },
    });

    return {
        users: response.data.data ?? [],
        hasMore: response.data.hasMore ?? false,
        nextOffset: response.data.nextOffset ?? offset,
    } satisfies SearchUsersPage;
}
