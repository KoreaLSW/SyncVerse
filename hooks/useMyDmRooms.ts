import { useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ChatRoomItem } from '@/lib/message/types';

type MyRoomsResponse = {
    data?: ChatRoomItem[];
};

export function useMyDmRooms() {
    const user = useAuthStore((state) => state.user);
    const enabled = !!user?.userId && user.authType !== 'guest';

    const { data, error, isLoading, mutate } = useSWR(
        enabled ? ['my-dm-rooms', user?.userId] : null,
        async () => {
            const response = await apiClient.get<MyRoomsResponse>('/api/chat/rooms/my', {
                params: { type: 'DM' },
            });
            return response.data.data ?? [];
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: false,
        },
    );

    useEffect(() => {
        if (!enabled || !user?.userId) return;
        const channel = supabase
            .channel(`my-dm-rooms:${user.userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_participants',
                    filter: `user_id=eq.${user.userId}`,
                },
                () => mutate(),
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_rooms',
                },
                () => mutate(),
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [enabled, mutate, user?.userId]);

    return {
        rooms: useMemo(() => data ?? [], [data]),
        isLoading,
        error,
        refresh: mutate,
        errorMessage: error
            ? '내 DM 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
            : null,
    };
}
