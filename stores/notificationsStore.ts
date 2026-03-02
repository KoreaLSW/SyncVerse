'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api';

export type NotificationItem = {
    id: string;
    user_id: string;
    actor_id: string | null;
    type: string;
    title: string;
    body: string | null;
    payload: Record<string, any>;
    source_key: string;
    read_at: string | null;
    acted_at: string | null;
    created_at: string;
    updated_at: string;
};

type NotificationsStore = {
    notifications: NotificationItem[];
    unreadCount: number;
    isLoading: boolean;
    init: (userId: string | null, isGuest: boolean) => Promise<void>;
    reset: () => void;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    markActed: (id: string) => Promise<void>;
    removeNotification: (id: string) => Promise<void>;
    clearReadNotifications: () => Promise<void>;
};

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function clearRealtimeChannel() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

function countUnread(list: NotificationItem[]) {
    return list.reduce((count, item) => count + (item.read_at ? 0 : 1), 0);
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    init: async (userId: string | null, isGuest: boolean) => {
        clearRealtimeChannel();
        if (!userId || isGuest) {
            set({ notifications: [], unreadCount: 0, isLoading: false });
            return;
        }

        set({ isLoading: true });
        try {
            const res = await apiClient.get('/api/notifications', {
                params: { limit: 50 },
            });
            const list = (res.data.data as NotificationItem[]) ?? [];
            set({
                notifications: list,
                unreadCount: countUnread(list),
                isLoading: false,
            });
        } catch (error) {
            console.error('알림 목록 로드 실패:', error);
            set({ isLoading: false });
        }

        // 알림 삽입 처리
        const handleInsert = (payload: any) => {
            const row = payload.new as NotificationItem | undefined;
            if (!row || row.user_id !== userId) return;
            set((state) => {
                if (state.notifications.some((item) => item.id === row.id)) {
                    return state;
                }
                const next = [row, ...state.notifications].sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() -
                        new Date(a.created_at).getTime(),
                );
                return {
                    notifications: next,
                    unreadCount: countUnread(next),
                };
            });
        };

        // 알림 수정 처리
        const handleUpdate = (payload: any) => {
            const row = payload.new as NotificationItem | undefined;
            if (!row || row.user_id !== userId) return;
            set((state) => {
                const next = state.notifications.map((item) =>
                    item.id === row.id ? row : item,
                );
                return {
                    notifications: next,
                    unreadCount: countUnread(next),
                };
            });
        };

        // 알림 삭제 처리
        const handleDelete = (payload: any) => {
            const row = payload.old as NotificationItem | undefined;
            if (!row || row.user_id !== userId) return;
            set((state) => {
                const next = state.notifications.filter(
                    (item) => item.id !== row.id,
                );
                return {
                    notifications: next,
                    unreadCount: countUnread(next),
                };
            });
        };

        realtimeChannel = supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                handleInsert,
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                handleUpdate,
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                handleDelete,
            )
            .subscribe();
    },

    // 알림 목록 초기화
    reset: () => {
        clearRealtimeChannel();
        set({ notifications: [], unreadCount: 0, isLoading: false });
    },

    // 알림 읽음 처리
    markRead: async (id: string) => {
        const existing = get().notifications.find((item) => item.id === id);
        if (!existing || existing.read_at) return;

        try {
            const res = await apiClient.patch(`/api/notifications/${id}/read`);
            const nextItem = res.data.data as NotificationItem | undefined;
            if (!nextItem) return;

            set((state) => {
                const next = state.notifications.map((item) =>
                    item.id === id ? nextItem : item,
                );
                return {
                    notifications: next,
                    unreadCount: countUnread(next),
                };
            });
        } catch (error) {
            console.error('알림 읽음 처리 실패:', error);
        }
    },

    // 모든 알림 읽음 처리
    markAllRead: async () => {
        const now = new Date().toISOString();
        try {
            const res = await apiClient.post('/api/notifications/read-all');
            const readAt = (res.data.readAt as string | undefined) ?? now;
            set((state) => {
                const next = state.notifications.map((item) =>
                    item.read_at ? item : { ...item, read_at: readAt },
                );
                return {
                    notifications: next,
                    unreadCount: 0,
                };
            });
        } catch (error) {
            console.error('전체 알림 읽음 처리 실패:', error);
        }
    },

    markActed: async (id: string) => {
        try {
            const res = await apiClient.post(`/api/notifications/${id}/act`);
            const nextItem = res.data.data as NotificationItem | undefined;
            if (!nextItem) return;

            set((state) => {
                const next = state.notifications.map((item) =>
                    item.id === id ? nextItem : item,
                );
                return {
                    notifications: next,
                    unreadCount: countUnread(next),
                };
            });
        } catch (error) {
            console.error('알림 액션 처리 실패:', error);
        }
    },

    removeNotification: async (id: string) => {
        try {
            await apiClient.delete(`/api/notifications/${id}`);
            set((state) => {
                const next = state.notifications.filter(
                    (item) => item.id !== id,
                );
                return {
                    notifications: next,
                    unreadCount: countUnread(next),
                };
            });
        } catch (error) {
            console.error('알림 삭제 실패:', error);
        }
    },

    clearReadNotifications: async () => {
        try {
            await apiClient.delete('/api/notifications', {
                params: { readOnly: true },
            });
            set((state) => {
                const next = state.notifications.filter(
                    (item) => item.read_at === null,
                );
                return {
                    notifications: next,
                    unreadCount: countUnread(next),
                };
            });
        } catch (error) {
            console.error('읽은 알림 삭제 실패:', error);
        }
    },
}));
