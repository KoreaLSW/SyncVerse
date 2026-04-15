import useSWR from 'swr';
import { fetchNicknameByUsername } from '@/lib/settings/profile';

type UseCurrentNicknameParams = {
    username?: string | null;
    fallbackNickname?: string | null;
    fallbackUsername?: string | null;
};

export function useCurrentNickname({
    username,
    fallbackNickname,
    fallbackUsername,
}: UseCurrentNicknameParams) {
    const trimmedUsername = username?.trim() || null;
    const trimmedFallbackNickname = fallbackNickname?.trim() || null;
    const trimmedFallbackUsername = fallbackUsername?.trim() || null;

    const { data, error, isLoading, mutate } = useSWR(
        trimmedUsername
            ? (['settings-current-nickname', trimmedUsername] as const)
            : null,
        ([, currentUsername]) => fetchNicknameByUsername(currentUsername),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: false,
        }
    );

    const dbNickname = data?.nickname ?? null;
    const currentNickname =
        dbNickname ||
        trimmedFallbackNickname ||
        trimmedFallbackUsername ||
        '닉네임 없음';

    return {
        currentNickname,
        dbNickname,
        isLoading: !!trimmedUsername && isLoading,
        error,
        refresh: mutate,
    };
}
