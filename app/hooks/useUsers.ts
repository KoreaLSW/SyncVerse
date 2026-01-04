import useSWR from 'swr';
import { dataFetcher } from '@/app/lib/axiosFetcher';
import { useCallback, useMemo } from 'react';

interface User {
    id: string;
    email: string;
    nickname: string;
    avatar_config: any;
    created_at: string;
}

interface UseUsersResponse {
    users: User[] | undefined;
    error: any;
    isLoading: boolean;
    nicknameMap: Map<string, string>; // email -> nickname 매핑
    getNickname: (email: string) => string | undefined;
}

export function useUsers(): UseUsersResponse {
    const { data, error, isLoading } = useSWR<User[]>(
        '/api/users',
        dataFetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            refreshInterval: 0,
        }
    );
    // email -> nickname 매핑 생성
    const nicknameMap = useMemo(() => {
        const map = new Map<string, string>();
        if (data) {
            data.forEach((user) => {
                if (user.email) {
                    map.set(user.email, user.nickname);
                }
            });
        }
        return map;
    }, [data]);

    // email로 nickname 조회하는 헬퍼 함수
    const getNickname = useCallback(
        (email: string) => {
            return nicknameMap.get(email);
        },
        [nicknameMap]
    );

    return {
        users: data,
        error,
        isLoading,
        nicknameMap,
        getNickname,
    };
}
