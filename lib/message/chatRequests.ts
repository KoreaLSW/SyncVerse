import { apiClient } from '@/lib/api';

export type ChatRequestStatus =
    | 'PENDING'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'CANCELED'
    | 'EXPIRED';

export type ChatRequestItem = {
    id: string;
    targetId: string;
    targetNickname: string;
    targetUsername: string;
    status: ChatRequestStatus;
    createdAt: string;
    direction: 'sent' | 'received';
    canRespond: boolean;
};

export type ChatRequestScope = 'all' | 'sent' | 'received';

type ChatRequestListResponse = {
    data?: ChatRequestItem[];
    hasMore?: boolean;
    nextOffset?: number;
};

export type ChatRequestPage = {
    requests: ChatRequestItem[];
    hasMore: boolean;
    nextOffset: number;
};

export async function fetchChatRequests(params?: {
    scope?: ChatRequestScope;
    limit?: number;
    offset?: number;
}) {
    const scope = params?.scope ?? 'all';
    const limit = params?.limit ?? 20;
    const offset = params?.offset ?? 0;
    const response = await apiClient.get<ChatRequestListResponse>(
        '/api/chat-requests',
        {
            params: {
                scope,
                limit,
                offset,
            },
        },
    );

    return {
        requests: response.data.data ?? [],
        hasMore: response.data.hasMore ?? false,
        nextOffset: response.data.nextOffset ?? offset,
    } satisfies ChatRequestPage;
}

export async function requestDm(receiverId: string) {
    const response = await apiClient.post<{ data?: ChatRequestItem }>(
        '/api/chat-requests',
        { receiverId },
    );
    return response.data.data ?? null;
}

export async function respondDmRequest(
    requestId: string,
    action: 'accept' | 'reject' | 'cancel',
) {
    const response = await apiClient.post<{
        success?: boolean;
        roomId?: string;
        peer?: { id: string; nickname: string; username: string } | null;
    }>(`/api/chat-requests/${requestId}/respond`, { action });

    return {
        success: !!response.data.success,
        roomId: response.data.roomId ?? null,
        peer: response.data.peer ?? null,
    };
}

export async function deleteDmRequest(requestId: string) {
    const response = await apiClient.delete<{ success?: boolean }>(
        `/api/chat-requests/${requestId}`,
    );
    return {
        success: !!response.data.success,
    };
}
