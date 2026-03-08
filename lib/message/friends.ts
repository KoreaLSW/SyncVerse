import { apiClient } from '@/lib/api';
import type { SearchUserItem } from '@/lib/message/types';

type FriendListResponse = {
    data?: string[];
    friends?: SearchUserItem[];
    hasMore?: boolean;
    nextOffset?: number;
};

type FetchFriendListParams = {
    limit?: number;
    offset?: number;
};

export type FriendListPage = {
    friendIds: string[];
    friends: SearchUserItem[];
    hasMore: boolean;
    nextOffset: number;
};

export async function fetchFriendList({
    limit = 10,
    offset = 0,
}: FetchFriendListParams = {}): Promise<FriendListPage> {
    const response = await apiClient.get<FriendListResponse>('/api/friends/list', {
        params: { limit, offset },
    });

    return {
        friendIds: response.data.data ?? [],
        friends: response.data.friends ?? [],
        hasMore: response.data.hasMore ?? false,
        nextOffset: response.data.nextOffset ?? offset,
    };
}
