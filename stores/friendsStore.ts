'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api';

type FriendsStore = {
    friendsSet: Set<string>;
    isLoading: boolean;
    init: (userId: string | null, isGuest: boolean) => Promise<void>;
    reset: () => void;
    addFriend: (userId: string) => void;
    removeFriend: (userId: string) => void;
};

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function clearRealtimeChannel() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

export const useFriendsStore = create<FriendsStore>((set, get) => ({
    friendsSet: new Set(),
    isLoading: false,

    init: async (userId: string | null, isGuest: boolean) => {
        clearRealtimeChannel();
        if (!userId || isGuest) {
            set({ friendsSet: new Set(), isLoading: false });
            return;
        }

        set({ isLoading: true });
        try {
            const res = await apiClient.get('/api/friends/list');
            const friendIds = (res.data.data as string[]) ?? [];
            set({ friendsSet: new Set(friendIds), isLoading: false });
        } catch (error) {
            console.error('친구 목록 로드 실패:', error);
            set({ isLoading: false });
        }

        const handleRealtime = (payload: any) => {
            const row = payload.new ?? payload.old;
            if (!row) return;
            const isSender = row.sender_id === userId;
            const isReceiver = row.receiver_id === userId;
            if (!isSender && !isReceiver) return;

            const otherId = isSender ? row.receiver_id : row.sender_id;
            if (payload.eventType === 'DELETE') {
                get().removeFriend(otherId);
                return;
            }

            if (row.status === 'ACCEPTED') {
                get().addFriend(otherId);
            } else {
                get().removeFriend(otherId);
            }
        };

        realtimeChannel = supabase
            .channel(`friendships:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'friendships',
                    filter: `sender_id=eq.${userId}`,
                },
                handleRealtime
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'friendships',
                    filter: `receiver_id=eq.${userId}`,
                },
                handleRealtime
            )
            .subscribe();
    },

    reset: () => {
        clearRealtimeChannel();
        set({ friendsSet: new Set(), isLoading: false });
    },

    addFriend: (userId: string) => {
        const next = new Set(get().friendsSet);
        next.add(userId);
        set({ friendsSet: next });
    },

    removeFriend: (userId: string) => {
        const next = new Set(get().friendsSet);
        next.delete(userId);
        set({ friendsSet: next });
    },
}));
