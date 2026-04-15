import { apiClient } from '@/lib/api';

type SearchUserItem = {
    nickname?: string | null;
};

type SearchUsersResponse = {
    data?: SearchUserItem[];
};

const normalizeNickname = (value: string) => value.trim().toLowerCase();

export async function checkNicknameDuplicate(
    nickname: string,
): Promise<{ isDuplicate: boolean }> {
    const trimmed = nickname.trim();
    if (!trimmed) {
        return { isDuplicate: false };
    }

    const response = await apiClient.get<SearchUsersResponse>('/api/users', {
        params: {
            q: trimmed,
            limit: 20,
            offset: 0,
        },
    });

    const normalizedTarget = normalizeNickname(trimmed);
    const users = response.data?.data ?? [];
    const isDuplicate = users.some(
        (user) =>
            typeof user.nickname === 'string' &&
            normalizeNickname(user.nickname) === normalizedTarget,
    );

    return { isDuplicate };
}

type UpdateNicknameResponse = {
    data?: {
        nickname?: string | null;
    };
};

export async function updateNickname(
    username: string,
    nickname: string,
): Promise<{ nickname: string | null }> {
    const response = await apiClient.patch<UpdateNicknameResponse>(
        `/api/users/${username}`,
        {
            nickname,
        },
    );

    const updatedNickname = response.data?.data?.nickname;
    return {
        nickname:
            typeof updatedNickname === 'string' && updatedNickname.trim()
                ? updatedNickname.trim()
                : null,
    };
}
