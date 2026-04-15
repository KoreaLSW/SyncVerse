import { apiClient } from '@/lib/api';

type UserProfileResponse = {
    data?: {
        nickname?: string | null;
    };
};

export async function fetchNicknameByUsername(username: string): Promise<{
    nickname: string | null;
}> {
    const response = await apiClient.get<UserProfileResponse>(
        `/api/users/${username}`
    );
    const nickname = response.data?.data?.nickname;

    return {
        nickname:
            typeof nickname === 'string' && nickname.trim()
                ? nickname.trim()
                : null,
    };
}
