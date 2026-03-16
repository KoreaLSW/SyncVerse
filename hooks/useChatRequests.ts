import { useEffect, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import useSWRMutation from 'swr/mutation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
    deleteDmRequest,
    fetchChatRequests,
    respondDmRequest,
    requestDm,
    type ChatRequestItem,
    type ChatRequestStatus,
} from '@/lib/message/chatRequests';
import type { ChatRoomItem, DmRequestItem } from '@/lib/message/types';

const STATUS_LABEL_MAP: Record<ChatRequestStatus, DmRequestItem['status']> = {
    PENDING: '요청중',
    ACCEPTED: '수락',
    REJECTED: '거절',
    CANCELED: '취소',
    EXPIRED: '만료',
};

function formatRelativeTime(isoTime: string) {
    const timestamp = new Date(isoTime).getTime();
    if (Number.isNaN(timestamp)) return '방금';
    const diffMs = Date.now() - timestamp;
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return '방금';
    if (diffMinutes < 60) return `${diffMinutes}분 전`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}일 전`;
}

function toDmRequestItem(item: ChatRequestItem): DmRequestItem {
    const targetName = item.targetNickname || item.targetUsername || '알 수 없음';
    return {
        id: item.id,
        target: targetName,
        status: STATUS_LABEL_MAP[item.status],
        createdAt: formatRelativeTime(item.createdAt),
        direction: item.direction,
        canRespond: item.canRespond,
    };
}

export function useChatRequests() {
    const user = useAuthStore((state) => state.user);
    const PAGE_SIZE = 20;
    const getKey = (
        pageIndex: number,
        previousPageData?: { hasMore: boolean },
    ) => {
        if (previousPageData && !previousPageData.hasMore) return null;
        return ['chat-requests-all', pageIndex * PAGE_SIZE] as const;
    };

    const { data, error, isValidating, mutate } = useSWRInfinite(
        getKey,
        ([, offset]) =>
            fetchChatRequests({
                scope: 'all',
                limit: PAGE_SIZE,
                offset: Number(offset),
            }),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: false,
        },
    );

    const {
        trigger: triggerRequestDm,
        isMutating: isRequestingDm,
    } = useSWRMutation(
        'chat-requests-create',
        async (_key, { arg }: { arg: { receiverId: string } }) => {
            const created = await requestDm(arg.receiverId);
            return created;
        },
        {
            onSuccess: async () => {
                await mutate();
            },
        },
    );

    const {
        trigger: triggerRespondDm,
        isMutating: isRespondingDm,
    } = useSWRMutation(
        'chat-requests-respond',
        async (
            _key,
            {
                arg,
            }: { arg: { requestId: string; action: 'accept' | 'reject' | 'cancel' } },
        ) => {
            return respondDmRequest(arg.requestId, arg.action);
        },
        {
            onSuccess: async () => {
                await mutate();
            },
        },
    );

    const {
        trigger: triggerDeleteDm,
        isMutating: isDeletingDm,
    } = useSWRMutation(
        'chat-requests-delete',
        async (_key, { arg }: { arg: { requestId: string } }) => {
            return deleteDmRequest(arg.requestId);
        },
        {
            onSuccess: async () => {
                await mutate();
            },
        },
    );

    const rawRequests = useMemo(
        () => data?.flatMap((page) => page.requests) ?? [],
        [data],
    );

    const requests = useMemo(() => rawRequests.map(toDmRequestItem), [rawRequests]);

    const acceptedDmRooms = useMemo<ChatRoomItem[]>(() => {
        const uniqueByRoomId = new Map<string, ChatRoomItem>();
        for (const item of rawRequests) {
            if (item.status !== 'ACCEPTED' || !item.resolvedRoomId) continue;
            if (uniqueByRoomId.has(item.resolvedRoomId)) continue;
            const roomName = item.targetNickname || item.targetUsername || '1:1 대화';
            uniqueByRoomId.set(item.resolvedRoomId, {
                id: item.resolvedRoomId,
                name: roomName,
                type: 'DM',
                unreadCount: 0,
                latestMessage: '대화가 시작되었습니다.',
                latestAt: formatRelativeTime(item.createdAt),
            });
        }
        return Array.from(uniqueByRoomId.values());
    }, [rawRequests]);

    useEffect(() => {
        if (!user?.userId || user.authType === 'guest') return;

        const revalidateRequests = () => {
            mutate();
        };

        const channel = supabase
            .channel(`chat-requests:${user.userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_requests',
                    filter: `sender_id=eq.${user.userId}`,
                },
                revalidateRequests,
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_requests',
                    filter: `receiver_id=eq.${user.userId}`,
                },
                revalidateRequests,
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [mutate, user?.authType, user?.userId]);

    return {
        requests,
        acceptedDmRooms,
        isLoading: !data && isValidating,
        errorMessage: error
            ? '요청 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
            : null,
        requestDm: (receiverId: string) => triggerRequestDm({ receiverId }),
        isRequestingDm,
        respondDm: (
            requestId: string,
            action: 'accept' | 'reject' | 'cancel',
        ) => triggerRespondDm({ requestId, action }),
        deleteDm: (requestId: string) => triggerDeleteDm({ requestId }),
        isDeletingDm,
        isRespondingDm,
    };
}
