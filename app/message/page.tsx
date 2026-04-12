'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageChatSection } from '@/components/message/MessageChatSection';
import { MessageRequestPanel } from '@/components/message/MessageRequestPanel';
import { MessageRoomSidebar } from '@/components/message/MessageRoomSidebar';
import { useChat } from '@/hooks/useChat';
import { useChatRequests } from '@/hooks/useChatRequests';
import { useFriendList } from '@/hooks/useFriendList';
import { useMyDmRooms } from '@/hooks/useMyDmRooms';
import { useUserSearch } from '@/hooks/useUserSearch';
import { apiClient } from '@/lib/api';
import { compressImageForUpload } from '@/lib/message/imageCompression';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
    ROOM_FILTERS,
    statusClassName,
} from '@/lib/message/mockData';
import type { ChatRoomItem, MessageItem, RoomFilter } from '@/lib/message/types';

type ChatMessageAttachmentResponse = {
    id: string;
    resource_type?: string | null;
    public_id?: string | null;
    secure_url?: string | null;
    format?: string | null;
    width?: number | null;
    height?: number | null;
    bytes?: number | null;
};

type ChatMessageResponse = {
    id: string;
    sender_name?: string | null;
    content?: string | null;
    created_at?: string | null;
    sender_id?: string | null;
    is_read_by_peer?: boolean;
    attachments?: ChatMessageAttachmentResponse[] | null;
};

type PendingImage = {
    id: string;
    file: File;
    previewUrl: string;
};

type OpenDmResponse = {
    success?: boolean;
    roomId?: string | null;
    peer?: {
        id?: string;
        nickname?: string | null;
        username?: string | null;
    } | null;
};

type CreateGroupRoomResponse = {
    data?: {
        id?: string;
        name?: string | null;
        max_capacity?: number | null;
        created_by?: string | null;
    };
};

type GroupRoomScope = 'ALL' | 'MY' | 'FRIEND' | 'OTHERS';

type RoomAccessInfo = {
    roomId: string;
    isParticipant: boolean;
    requiresPassword: boolean;
    maxCapacity: number | null;
    currentParticipants: number;
    canJoin: boolean;
};

const GROUP_ROOM_SCOPE_OPTIONS: Array<{ value: GroupRoomScope; label: string }> = [
    { value: 'ALL', label: '전체' },
    { value: 'MY', label: 'My' },
    { value: 'FRIEND', label: 'Friend' },
    { value: 'OTHERS', label: '그 외' },
];

function formatLatestAt(isoTime: string) {
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

export default function MessagePage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const [filter, setFilter] = useState<RoomFilter>('ALL');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [draft, setDraft] = useState('');
    const [isLeavingRoom, setIsLeavingRoom] = useState(false);
    const [isOpeningDm, setIsOpeningDm] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isPreparingImage, setIsPreparingImage] = useState(false);
    const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
    const [isGroupCreateModalOpen, setIsGroupCreateModalOpen] = useState(false);
    const [groupRoomName, setGroupRoomName] = useState('');
    const [groupRoomPassword, setGroupRoomPassword] = useState('');
    const [groupRoomMaxCapacity, setGroupRoomMaxCapacity] = useState('');
    const [isCreatingGroupRoom, setIsCreatingGroupRoom] = useState(false);
    const [groupScope, setGroupScope] = useState<GroupRoomScope>('ALL');
    const [selectedImages, setSelectedImages] = useState<PendingImage[]>([]);
    const [isChatAtBottom, setIsChatAtBottom] = useState(true);
    const [isTabVisible, setIsTabVisible] = useState(true);
    const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
    const [groupRooms, setGroupRooms] = useState<ChatRoomItem[]>([]);
    const [roomAccessByRoomId, setRoomAccessByRoomId] = useState<
        Record<string, RoomAccessInfo>
    >({});
    const [isCheckingRoomAccess, setIsCheckingRoomAccess] = useState(false);
    const [groupJoinPassword, setGroupJoinPassword] = useState('');
    const [isJoiningGroupRoom, setIsJoiningGroupRoom] = useState(false);
    const [groupJoinErrorMessage, setGroupJoinErrorMessage] = useState<string | null>(
        null,
    );
    const {
        searchedUsers,
        isLoading: isSearchLoading,
        isLoadingMore: isSearchLoadingMore,
        hasMore: hasMoreSearchedUsers,
        loadMore: loadMoreSearchedUsers,
        errorMessage,
    } = useUserSearch(searchKeyword, {
        debounceMs: 250,
        limit: 10,
    });
    const {
        friends,
        friendIds,
        isLoading: isFriendLoading,
        isLoadingMore: isFriendLoadingMore,
        hasMore: hasMoreFriends,
        loadMore: loadMoreFriends,
        errorMessage: friendErrorMessage,
    } = useFriendList();
    const {
        requests,
        isRequestingDm,
        respondDm,
        deleteDm,
        isRespondingDm,
        isDeletingDm,
        errorMessage: requestStatusErrorMessage,
        requestDm,
    } = useChatRequests();
    const { rooms: myDmRooms, refresh: refreshMyDmRooms } = useMyDmRooms();
    const selectedRoomAccess = roomAccessByRoomId[selectedRoomId] ?? null;
    const isSelectedGroupRoom = groupRooms.some((room) => room.id === selectedRoomId);
    const chatRoomIdForHook = isSelectedGroupRoom
        ? selectedRoomAccess?.isParticipant
            ? selectedRoomId
            : ''
        : selectedRoomId;
    const {
        messages: dbMessages,
        sendMessage,
        uploadImageMessage,
        deleteMessage,
        isPeerTyping,
        peerTypingName,
        notifyTyping,
        stopTyping,
    } = useChat(chatRoomIdForHook);
    const lastReadCallMsByRoomRef = useRef<Record<string, number>>({});
    const selectedImagesRef = useRef<PendingImage[]>([]);
    const READ_THROTTLE_MS = 700;
    const [roomSummaryByRoomId, setRoomSummaryByRoomId] = useState<
        Record<string, { latestMessage: string; latestAt: string; unreadCount: number }>
    >({});

    useEffect(() => {
        selectedImagesRef.current = selectedImages;
    }, [selectedImages]);

    useEffect(() => {
        return () => {
            selectedImagesRef.current.forEach((item) =>
                URL.revokeObjectURL(item.previewUrl),
            );
        };
    }, []);

    const mergedRooms = useMemo(() => {
        const merged = new Map<string, ChatRoomItem>();
        for (const room of groupRooms) {
            merged.set(room.id, room);
        }
        for (const room of rooms) {
            merged.set(room.id, room);
        }
        for (const room of myDmRooms) {
            if (!merged.has(room.id)) {
                merged.set(room.id, room);
            }
        }
        return Array.from(merged.values());
    }, [groupRooms, rooms, myDmRooms]);

    const roomIds = useMemo(() => mergedRooms.map((room) => room.id), [mergedRooms]);
    const roomIdsKey = useMemo(
        () => [...roomIds].sort().join(','),
        [roomIds],
    );

    useEffect(() => {
        if (!roomIds.length) {
            setRoomSummaryByRoomId({});
            return;
        }

        let cancelled = false;
        const roomIdSet = new Set(roomIds);

        const loadRoomSummary = async () => {
            try {
                const response = await apiClient.get<{
                    data?: Array<{
                        roomId: string;
                        latestMessage: string;
                        latestAt: string;
                        unreadCount: number;
                    }>;
                }>('/api/chat/rooms/summary', {
                    params: {
                        roomIds: roomIds.join(','),
                    },
                });
                if (cancelled) return;

                const next: Record<
                    string,
                    { latestMessage: string; latestAt: string; unreadCount: number }
                > = {};
                for (const item of response.data.data ?? []) {
                    const roomId = String(item.roomId ?? '');
                    if (!roomId) continue;
                    next[roomId] = {
                        latestMessage: String(item.latestMessage ?? ''),
                        latestAt: item.latestAt ? formatLatestAt(item.latestAt) : '',
                        unreadCount: Math.max(0, Number(item.unreadCount ?? 0)),
                    };
                }
                setRoomSummaryByRoomId(next);
            } catch (error) {
                console.error('대화방 요약 로드 실패:', error);
            }
        };

        loadRoomSummary();

        const channel = supabase
            .channel(`room-latest:${roomIdsKey}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    const roomId = String(payload.new.room_id ?? '');
                    if (!roomIdSet.has(roomId)) return;
                    const senderId = String(payload.new.sender_id ?? '');
                    const isMine = !!user?.userId && senderId === user.userId;
                    const shouldIncreaseUnread = !isMine && roomId !== selectedRoomId;
                    setRoomSummaryByRoomId((prev) => ({
                        ...prev,
                        [roomId]: {
                            latestMessage:
                                String(payload.new.content ?? '').trim() || '[사진]',
                            latestAt: payload.new.created_at
                                ? formatLatestAt(String(payload.new.created_at))
                                : '',
                            unreadCount: Math.max(
                                0,
                                (prev[roomId]?.unreadCount ?? 0) +
                                    (shouldIncreaseUnread ? 1 : 0),
                            ),
                        },
                    }));
                },
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [roomIds, roomIdsKey, selectedRoomId, user?.userId]);

    const roomsWithLatest = useMemo(
        () =>
            mergedRooms.map((room) => {
                const summary = roomSummaryByRoomId[room.id];
                if (!summary) return room;
                return {
                    ...room,
                    latestMessage: summary.latestMessage || room.latestMessage,
                    latestAt: summary.latestAt || room.latestAt,
                    unreadCount: summary.unreadCount,
                };
            }),
        [mergedRooms, roomSummaryByRoomId],
    );

    const visibleRooms = useMemo(() => {
        return roomsWithLatest.filter((room) =>
            filter === 'ALL' ? true : room.type === filter,
        );
    }, [filter, roomsWithLatest]);

    const selectedRoom = useMemo(
        () => roomsWithLatest.find((room) => room.id === selectedRoomId) ?? null,
        [selectedRoomId, roomsWithLatest],
    );

    const fetchRoomAccess = useCallback(async (roomId: string) => {
        if (!roomId) return;
        setIsCheckingRoomAccess(true);
        try {
            const response = await apiClient.get<{
                data?: {
                    roomId?: string;
                    isParticipant?: boolean;
                    requiresPassword?: boolean;
                    maxCapacity?: number | null;
                    currentParticipants?: number;
                    canJoin?: boolean;
                };
            }>(`/api/chat/rooms/${roomId}/access`);
            const data = response.data.data;
            setRoomAccessByRoomId((prev) => ({
                ...prev,
                [roomId]: {
                    roomId,
                    isParticipant: !!data?.isParticipant,
                    requiresPassword: !!data?.requiresPassword,
                    maxCapacity:
                        typeof data?.maxCapacity === 'number'
                            ? data.maxCapacity
                            : null,
                    currentParticipants: Math.max(
                        0,
                        Number(data?.currentParticipants ?? 0),
                    ),
                    canJoin: !!data?.canJoin,
                },
            }));
        } catch (error) {
            setRoomAccessByRoomId((prev) => ({
                ...prev,
                [roomId]: {
                    roomId,
                    isParticipant: false,
                    requiresPassword: false,
                    maxCapacity: null,
                    currentParticipants: 0,
                    canJoin: false,
                },
            }));
        } finally {
            setIsCheckingRoomAccess(false);
        }
    }, []);

    useEffect(() => {
        if (!selectedRoomId || selectedRoom?.type !== 'GROUP') {
            setGroupJoinErrorMessage(null);
            setGroupJoinPassword('');
            return;
        }
        fetchRoomAccess(selectedRoomId);
    }, [fetchRoomAccess, selectedRoom?.type, selectedRoomId]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsTabVisible(document.visibilityState === 'visible');
        };
        handleVisibilityChange();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    useEffect(() => {
        if (selectedRoomId && mergedRooms.some((room) => room.id === selectedRoomId)) {
            return;
        }
        const fallback = mergedRooms[0]?.id;
        if (fallback) {
            setSelectedRoomId(fallback);
        }
    }, [selectedRoomId, mergedRooms]);

    const markRoomAsRead = useCallback(
        async (roomId: string, options?: { force?: boolean }) => {
            if (!roomId || !user?.userId) return;
            const now = Date.now();
            const lastCalledAt = lastReadCallMsByRoomRef.current[roomId] ?? 0;
            if (!options?.force && now - lastCalledAt < READ_THROTTLE_MS) return;
            lastReadCallMsByRoomRef.current[roomId] = now;

            try {
                await apiClient.post(`/api/chat/rooms/${roomId}/read`);
                setRoomSummaryByRoomId((prev) => {
                    const existing = prev[roomId];
                    if (!existing) return prev;
                    return {
                        ...prev,
                        [roomId]: {
                            ...existing,
                            unreadCount: 0,
                        },
                    };
                });
            } catch (error) {
                console.error('읽음 처리 실패:', error);
            }
        },
        [user?.userId],
    );

    // 방 전환 시에는 즉시 읽음 처리
    useEffect(() => {
        if (!chatRoomIdForHook || !user?.userId) return;
        markRoomAsRead(chatRoomIdForHook, { force: true });
    }, [chatRoomIdForHook, user?.userId, markRoomAsRead]);

    // 현재 방에서 새 메시지를 수신했고, 화면이 보이며 하단이면 읽음 처리
    useEffect(() => {
        if (!chatRoomIdForHook || !user?.userId) return;
        if (!isTabVisible || !isChatAtBottom) return;
        if (!dbMessages?.length) return;
        const latest = dbMessages[dbMessages.length - 1];
        if (!latest) return;
        const latestSenderId = String(latest.sender_id ?? '');
        if (!latestSenderId || latestSenderId === user.userId) return;
        markRoomAsRead(chatRoomIdForHook);
    }, [
        dbMessages?.length,
        chatRoomIdForHook,
        isChatAtBottom,
        isTabVisible,
        markRoomAsRead,
        user?.userId,
    ]);

    // 탭이 다시 활성화됐고 현재 방이 보이는 상태면 읽음 처리
    useEffect(() => {
        if (!chatRoomIdForHook || !user?.userId) return;
        if (!isTabVisible || !isChatAtBottom) return;
        markRoomAsRead(chatRoomIdForHook);
    }, [
        chatRoomIdForHook,
        isChatAtBottom,
        isTabVisible,
        markRoomAsRead,
        user?.userId,
    ]);

    const currentMessages = useMemo<MessageItem[]>(
        () =>
            (dbMessages ?? []).map((message: ChatMessageResponse) => ({
                id: String(message.id),
                sender: String(message.sender_name ?? '알 수 없음'),
                content: String(message.content ?? ''),
                createdAt: message.created_at
                    ? new Date(message.created_at).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                      })
                    : '방금',
                attachments: Array.isArray(message.attachments)
                    ? message.attachments.map((attachment) => ({
                          id: String(attachment.id),
                          provider: 'CLOUDINARY' as const,
                          resourceType: String(attachment.resource_type ?? 'IMAGE') as
                              | 'IMAGE'
                              | 'VIDEO'
                              | 'FILE',
                          publicId: String(attachment.public_id ?? ''),
                          secureUrl: String(attachment.secure_url ?? ''),
                          format: attachment.format
                              ? String(attachment.format)
                              : null,
                          width:
                              typeof attachment.width === 'number'
                                  ? attachment.width
                                  : null,
                          height:
                              typeof attachment.height === 'number'
                                  ? attachment.height
                                  : null,
                          bytes:
                              typeof attachment.bytes === 'number'
                                  ? attachment.bytes
                                  : null,
                      }))
                    : [],
                isMine: !!user?.userId && String(message.sender_id) === user.userId,
                isReadByPeer: !!message.is_read_by_peer,
            })),
        [dbMessages, user?.userId],
    );

    const handleSend = async () => {
        if (isPreparingImage) return;
        const content = draft.trim();
        const hasSelectedImage = selectedImages.length > 0;
        if ((!content && !hasSelectedImage) || !chatRoomIdForHook || !user?.userId) {
            return;
        }

        stopTyping();
        try {
            if (hasSelectedImage) {
                setIsUploadingImage(true);
                await uploadImageMessage({
                    room_id: chatRoomIdForHook,
                    sender_id: user.userId,
                    sender_name: user.nickname || user.username || user.name || '나',
                    files: selectedImages.map((item) => item.file),
                    content,
                });
                setSelectedImages((prev) => {
                    prev.forEach((item) => URL.revokeObjectURL(item.previewUrl));
                    return [];
                });
            } else {
                await sendMessage({
                    room_id: chatRoomIdForHook,
                    sender_id: user.userId,
                    sender_name: user.nickname || user.username || user.name || '나',
                    content,
                });
            }
            setRoomSummaryByRoomId((prev) => ({
                ...prev,
                [chatRoomIdForHook]: {
                    latestMessage:
                        content ||
                        (selectedImages.length > 1
                            ? `[사진 ${selectedImages.length}장]`
                            : '[사진]'),
                    latestAt: '방금',
                    unreadCount: 0,
                },
            }));
            setDraft('');
        } catch (error) {
            alert('전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const refreshSingleRoomSummary = useCallback(async (roomId: string) => {
        if (!roomId) return;
        try {
            const response = await apiClient.get<{
                data?: Array<{
                    roomId: string;
                    latestMessage: string;
                    latestAt: string;
                    unreadCount: number;
                }>;
            }>('/api/chat/rooms/summary', {
                params: {
                    roomIds: roomId,
                },
            });
            const item = response.data.data?.[0];
            if (!item) {
                setRoomSummaryByRoomId((prev) => {
                    if (!prev[roomId]) return prev;
                    const next = { ...prev };
                    delete next[roomId];
                    return next;
                });
                return;
            }
            setRoomSummaryByRoomId((prev) => ({
                ...prev,
                [roomId]: {
                    latestMessage: String(item.latestMessage ?? ''),
                    latestAt: item.latestAt ? formatLatestAt(item.latestAt) : '',
                    unreadCount: Math.max(0, Number(item.unreadCount ?? 0)),
                },
            }));
        } catch (error) {
            console.error('단일 대화방 요약 갱신 실패:', error);
        }
    }, []);

    const handleDeleteMessage = useCallback(
        async (messageId: string) => {
            if (!selectedRoomId || !user?.userId || !messageId) return;
            const target = currentMessages.find((message) => message.id === messageId);
            if (!target?.isMine) {
                alert('본인이 작성한 메시지만 삭제할 수 있습니다.');
                return;
            }
            const confirmed = window.confirm('이 메시지를 삭제할까요?');
            if (!confirmed) return;

            setDeletingMessageId(messageId);
            try {
                await deleteMessage(messageId);
                await refreshSingleRoomSummary(selectedRoomId);
            } catch (error) {
                alert('메시지 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            } finally {
                setDeletingMessageId(null);
            }
        },
        [
            currentMessages,
            deleteMessage,
            refreshSingleRoomSummary,
            selectedRoomId,
            user?.userId,
        ],
    );

    const handleRequestDm = async (receiverId: string) => {
        try {
            await requestDm(receiverId);
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response
                ?.status;
            const message =
                status === 409
                    ? '이미 진행 중인 1:1 요청이 있습니다.'
                    : '1:1 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
            alert(message);
        }
    };

    const handleDraftChange = useCallback(
        (value: string) => {
            setDraft(value);
            if (!chatRoomIdForHook || !user?.userId) return;
            if (value.trim()) {
                notifyTyping();
                return;
            }
            stopTyping();
        },
        [chatRoomIdForHook, notifyTyping, stopTyping, user?.userId],
    );

    const handleOpenDm = async (targetUser: {
        id: string;
        nickname?: string;
        username?: string;
    }) => {
        if (!targetUser.id) return;
        setIsOpeningDm(true);
        try {
            const response = await apiClient.post<OpenDmResponse>(
                '/api/chat/rooms/dm/open',
                {
                    peerUserId: targetUser.id,
                },
            );
            const roomId = String(response.data.roomId ?? '');
            if (!response.data.success || !roomId) {
                throw new Error('roomId missing');
            }

            const roomName =
                response.data.peer?.nickname ||
                response.data.peer?.username ||
                targetUser.nickname ||
                targetUser.username ||
                '1:1 대화';

            setRooms((prev) => {
                if (prev.some((room) => room.id === roomId)) return prev;
                return [
                    {
                        id: roomId,
                        name: roomName,
                        type: 'DM',
                        unreadCount: 0,
                        latestMessage: '대화가 시작되었습니다.',
                        latestAt: '방금',
                    },
                    ...prev,
                ];
            });
            setFilter('DM');
            setSelectedRoomId(roomId);
            await refreshMyDmRooms();
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response
                ?.status;
            const message =
                status === 403
                    ? '친구 상태에서만 바로 대화를 열 수 있습니다.'
                    : '대화방 열기에 실패했습니다. 잠시 후 다시 시도해 주세요.';
            alert(message);
        } finally {
            setIsOpeningDm(false);
        }
    };

    const handleSelectImages = async (files: File[]) => {
        if (!files.length) return;
        const MAX_IMAGES_PER_MESSAGE = 10;
        const maxBytes = 10 * 1024 * 1024;

        setIsPreparingImage(true);
        const prepared: PendingImage[] = [];
        try {
            const remain = Math.max(0, MAX_IMAGES_PER_MESSAGE - selectedImages.length);
            const candidates = files.slice(0, remain);

            for (const file of candidates) {
                if (!file.type.startsWith('image/')) {
                    alert('이미지 파일만 업로드할 수 있습니다.');
                    continue;
                }
                if (file.size > maxBytes) {
                    alert(`"${file.name}" 파일은 10MB를 초과합니다.`);
                    continue;
                }

                let uploadFile = file;
                try {
                    uploadFile = await compressImageForUpload(file, {
                        maxLongEdge: 1600,
                        targetMaxBytes: 2 * 1024 * 1024,
                    });
                } catch (error) {
                    console.error('이미지 압축 실패:', error);
                    uploadFile = file;
                }

                prepared.push({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    file: uploadFile,
                    previewUrl: URL.createObjectURL(uploadFile),
                });
            }

            setSelectedImages((prev) => [...prev, ...prepared]);

            if (files.length > remain) {
                alert(`사진은 한 번에 최대 ${MAX_IMAGES_PER_MESSAGE}장까지 전송할 수 있습니다.`);
            }
        } finally {
            setIsPreparingImage(false);
        }
    };

    const handleRespondDm = async (
        requestId: string,
        action: 'accept' | 'reject' | 'cancel',
    ) => {
        try {
            const request = requests.find((item) => item.id === requestId);
            const response = await respondDm(requestId, action);
            if (
                action === 'accept' &&
                response?.success &&
                response.roomId
            ) {
                const roomId = response.roomId;
                const roomName =
                    response.peer?.nickname ||
                    response.peer?.username ||
                    request?.target ||
                    '1:1 대화';
                setRooms((prev) => {
                    if (prev.some((room) => room.id === roomId)) return prev;
                    const nextRoom: ChatRoomItem = {
                        id: roomId,
                        name: roomName,
                        type: 'DM',
                        unreadCount: 0,
                        latestMessage: '대화가 시작되었습니다.',
                        latestAt: '방금',
                    };
                    return [nextRoom, ...prev];
                });
                setFilter('DM');
                setSelectedRoomId(roomId);
            }
        } catch (error) {
            alert('요청 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
    };

    const handleDeleteDm = async (requestId: string) => {
        try {
            await deleteDm(requestId);
        } catch (error) {
            alert('요청 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        }
    };

    const handleLeaveRoom = async () => {
        if (!selectedRoom) return;
        if (selectedRoom.type === 'GROUP') {
            const selectedAccess = roomAccessByRoomId[selectedRoom.id];
            if (!selectedAccess?.isParticipant) return;
            const isGroupOwner = selectedRoom.createdBy === user?.userId;
            const confirmed = window.confirm(
                isGroupOwner
                    ? '방장이 채팅방을 삭제하면 대화내역이 함께 삭제됩니다. 계속할까요?'
                    : '채팅방에서 나가시겠어요?',
            );
            if (!confirmed) return;

            setIsLeavingRoom(true);
            try {
                if (isGroupOwner) {
                    await apiClient.delete(`/api/chat/rooms/${selectedRoom.id}`);
                } else {
                    await apiClient.post(`/api/chat/rooms/${selectedRoom.id}/leave`);
                }

                setGroupRooms((prev) =>
                    prev.filter((room) => room.id !== selectedRoom.id),
                );
                setRoomSummaryByRoomId((prev) => {
                    if (!prev[selectedRoom.id]) return prev;
                    const next = { ...prev };
                    delete next[selectedRoom.id];
                    return next;
                });
                setRoomAccessByRoomId((prev) => {
                    if (!prev[selectedRoom.id]) return prev;
                    const next = { ...prev };
                    delete next[selectedRoom.id];
                    return next;
                });
                if (selectedRoomId === selectedRoom.id) {
                    setSelectedRoomId('');
                }
            } catch (error: unknown) {
                const code = (
                    error as { response?: { data?: { code?: string } } }
                )?.response?.data?.code;
                const message =
                    code === 'OWNER_DELETE_REQUIRED'
                        ? '방장은 나가기 대신 채팅방 삭제를 진행해야 합니다.'
                        : isGroupOwner
                          ? '그룹 채팅방 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.'
                          : '채팅방 나가기에 실패했습니다. 잠시 후 다시 시도해 주세요.';
                alert(message);
            } finally {
                setIsLeavingRoom(false);
            }
            return;
        }

        if (selectedRoom.type !== 'DM') return;
        const confirmed = window.confirm(
            '대화방을 나가면 대화내역이 함께 삭제됩니다. 계속할까요?',
        );
        if (!confirmed) return;

        setIsLeavingRoom(true);
        try {
            await apiClient.delete(`/api/chat/rooms/${selectedRoom.id}`);
            setRooms((prev) => prev.filter((room) => room.id !== selectedRoom.id));
            setRoomSummaryByRoomId((prev) => {
                if (!prev[selectedRoom.id]) return prev;
                const next = { ...prev };
                delete next[selectedRoom.id];
                return next;
            });
            if (selectedRoomId === selectedRoom.id) {
                setSelectedRoomId('');
            }
            await refreshMyDmRooms();
        } catch (error) {
            alert('대화방 나가기에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setIsLeavingRoom(false);
        }
    };

    const handleSelectRoom = useCallback(
        (roomId: string) => {
            const targetRoom = roomsWithLatest.find((room) => room.id === roomId);
            if (targetRoom?.type === 'GROUP') {
                setRoomAccessByRoomId((prev) => ({
                    ...prev,
                    [roomId]: prev[roomId] ?? {
                        roomId,
                        isParticipant: false,
                        requiresPassword: false,
                        maxCapacity: null,
                        currentParticipants: 0,
                        canJoin: true,
                    },
                }));
                setGroupJoinPassword('');
                setGroupJoinErrorMessage(null);
            }
            setSelectedRoomId(roomId);
        },
        [roomsWithLatest],
    );

    const handleJoinGroupRoom = useCallback(async () => {
        if (!selectedRoomId || selectedRoom?.type !== 'GROUP') return;
        const access = roomAccessByRoomId[selectedRoomId];
        if (!access?.canJoin) {
            setGroupJoinErrorMessage('참여 가능한 상태가 아닙니다.');
            return;
        }
        if (access.requiresPassword && !groupJoinPassword.trim()) {
            setGroupJoinErrorMessage('비밀번호를 입력해 주세요.');
            return;
        }

        setIsJoiningGroupRoom(true);
        setGroupJoinErrorMessage(null);
        try {
            await apiClient.post(`/api/chat/rooms/${selectedRoomId}/join`, {
                password: groupJoinPassword.trim(),
            });
            await fetchRoomAccess(selectedRoomId);
            setGroupJoinPassword('');
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response
                ?.status;
            const code = (
                error as { response?: { data?: { code?: string } } }
            )?.response?.data?.code;
            const message =
                status === 409 || code === 'ROOM_FULL'
                    ? '정원이 가득 찬 채팅방입니다.'
                    : code === 'WRONG_PASSWORD' || status === 403
                      ? '비밀번호가 올바르지 않습니다.'
                      : '채팅방 참여에 실패했습니다. 잠시 후 다시 시도해 주세요.';
            setGroupJoinErrorMessage(message);
        } finally {
            setIsJoiningGroupRoom(false);
        }
    }, [
        fetchRoomAccess,
        groupJoinPassword,
        roomAccessByRoomId,
        selectedRoom?.type,
        selectedRoomId,
    ]);

    const handleOpenGroupCreateModal = () => {
        setIsGroupCreateModalOpen(true);
    };

    const handleCloseGroupCreateModal = () => {
        if (isCreatingGroupRoom) return;
        setIsGroupCreateModalOpen(false);
        setGroupRoomName('');
        setGroupRoomPassword('');
        setGroupRoomMaxCapacity('');
    };

    const loadGroupRooms = useCallback(async (scope: GroupRoomScope) => {
        const scopeParam =
            scope === 'MY'
                ? 'my'
                : scope === 'FRIEND'
                  ? 'friend'
                  : scope === 'OTHERS'
                    ? 'others'
                    : 'all';
        try {
            const response = await apiClient.get<{
                data?: Array<{
                    id?: string;
                    name?: string | null;
                    memberCount?: number | null;
                    createdBy?: string | null;
                }>;
            }>('/api/chat/rooms/group', {
                params: { scope: scopeParam },
            });
            const nextGroupRooms: ChatRoomItem[] = [];
            for (const room of response.data.data ?? []) {
                const roomId = String(room.id ?? '');
                if (!roomId) continue;
                nextGroupRooms.push({
                    id: roomId,
                    name: String(room.name ?? '그룹 채팅방'),
                    type: 'GROUP',
                    memberCount:
                        typeof room.memberCount === 'number'
                            ? room.memberCount
                            : undefined,
                    createdBy: room.createdBy ? String(room.createdBy) : null,
                    unreadCount: 0,
                    latestMessage: '',
                    latestAt: '',
                });
            }
            setGroupRooms(nextGroupRooms);
        } catch (error) {
            console.error('그룹 채팅방 목록 로드 실패:', error);
            setGroupRooms([]);
        }
    }, []);

    useEffect(() => {
        if (filter !== 'GROUP') return;
        if (!user?.userId || user.authType === 'guest') return;
        loadGroupRooms(groupScope);
    }, [filter, groupScope, loadGroupRooms, user?.authType, user?.userId]);

    const parsedGroupRoomMaxCapacity = Number(groupRoomMaxCapacity);
    const isGroupRoomNameValid = groupRoomName.trim().length > 0;
    const isGroupRoomMaxCapacityValid =
        Number.isInteger(parsedGroupRoomMaxCapacity) &&
        parsedGroupRoomMaxCapacity >= 2 &&
        parsedGroupRoomMaxCapacity <= 50;
    const canSubmitGroupRoomCreate =
        isGroupRoomNameValid && isGroupRoomMaxCapacityValid;

    const handleCreateGroupRoom = async () => {
        if (isCreatingGroupRoom) return;
        const trimmedName = groupRoomName.trim();
        if (!trimmedName) {
            alert('채팅방 이름은 필수 입력입니다.');
            return;
        }
        if (!groupRoomMaxCapacity.trim()) {
            alert('최대 인원수는 필수 입력입니다.');
            return;
        }
        if (trimmedName.length >= 50) {
            alert('채팅방 이름은 50자 미만으로 입력해 주세요.');
            return;
        }
        if (!isGroupRoomMaxCapacityValid) {
            alert('최대 인원수는 2명 이상 50명 이하로 입력해 주세요.');
            return;
        }

        setIsCreatingGroupRoom(true);
        try {
            const response = await apiClient.post<CreateGroupRoomResponse>(
                '/api/chat/rooms',
                {
                    type: 'GROUP',
                    category: 'NONE',
                    name: trimmedName,
                    password: groupRoomPassword.trim() || null,
                    max_capacity: Number(groupRoomMaxCapacity),
                },
            );
            const created = response.data.data;
            const roomId = String(created?.id ?? '');
            if (!roomId) {
                throw new Error('room id missing');
            }
            setFilter('GROUP');
            setGroupScope('MY');
            setSelectedRoomId(roomId);
            await loadGroupRooms('MY');
            setIsGroupCreateModalOpen(false);
            setGroupRoomName('');
            setGroupRoomPassword('');
            setGroupRoomMaxCapacity('');
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response
                ?.status;
            const message =
                status === 400
                    ? '입력값을 확인해 주세요. (이름 50자 미만, 최대 인원 2~50)'
                    : status === 403
                      ? '게스트 계정은 그룹 채팅방을 생성할 수 없습니다.'
                      : '그룹 채팅방 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.';
            alert(message);
        } finally {
            setIsCreatingGroupRoom(false);
        }
    };

    return (
        <main className='min-h-screen bg-slate-950 text-white p-4 md:p-6'>
            <div className='mx-auto mb-3 max-w-[1500px]'>
                <button
                    type='button'
                    onClick={() => {
                        if (window.history.length > 1) {
                            router.back();
                            return;
                        }
                        router.push('/');
                    }}
                    className='rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-sm text-white backdrop-blur-md transition hover:bg-black/80'
                >
                    ← 뒤로가기
                </button>
            </div>
            <div className='mx-auto max-w-[1500px] grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr_340px]'>
                {/* 메세지 목록 메뉴 */}
                <MessageRoomSidebar
                    rooms={visibleRooms}
                    totalCount={roomsWithLatest.length}
                    filters={ROOM_FILTERS}
                    currentFilter={filter}
                    selectedRoomId={selectedRoomId}
                    onFilterChange={setFilter}
                    onSelectRoom={handleSelectRoom}
                    onCreateGroup={handleOpenGroupCreateModal}
                    groupScopes={GROUP_ROOM_SCOPE_OPTIONS}
                    currentGroupScope={groupScope}
                    onGroupScopeChange={setGroupScope}
                />
                {/* 메세지 내용 */}
                <MessageChatSection
                    selectedRoom={selectedRoom}
                    messages={currentMessages}
                    draft={draft}
                    onDraftChange={handleDraftChange}
                    onSend={handleSend}
                    isPeerTyping={isPeerTyping}
                    peerTypingName={peerTypingName}
                    onTypingStop={() => stopTyping()}
                    canSend={
                        !isPreparingImage &&
                        (!!draft.trim() || selectedImages.length > 0) &&
                        (selectedRoom?.type !== 'GROUP' ||
                            !!roomAccessByRoomId[selectedRoom.id]?.isParticipant)
                    }
                    selectedImagePreviews={selectedImages.map((item) => ({
                        id: item.id,
                        name: item.file.name,
                        url: item.previewUrl,
                    }))}
                    onSelectImages={handleSelectImages}
                    onRemoveSelectedImage={(imageId) => {
                        setSelectedImages((prev) => {
                            const target = prev.find((item) => item.id === imageId);
                            if (target) {
                                URL.revokeObjectURL(target.previewUrl);
                            }
                            return prev.filter((item) => item.id !== imageId);
                        });
                    }}
                    isUploadingImage={isUploadingImage}
                    isPreparingImage={isPreparingImage}
                    onLeaveRoom={handleLeaveRoom}
                    isLeavingRoom={isLeavingRoom}
                    onBottomStateChange={setIsChatAtBottom}
                    onDeleteMessage={handleDeleteMessage}
                    deletingMessageId={deletingMessageId}
                    isGroupParticipant={
                        selectedRoom?.type !== 'GROUP' ||
                        !!roomAccessByRoomId[selectedRoom.id]?.isParticipant
                    }
                    isCheckingRoomAccess={isCheckingRoomAccess}
                    requiresJoinPassword={
                        selectedRoom?.type === 'GROUP'
                            ? !!roomAccessByRoomId[selectedRoom.id]?.requiresPassword
                            : false
                    }
                    groupJoinPassword={groupJoinPassword}
                    onGroupJoinPasswordChange={setGroupJoinPassword}
                    onJoinGroupRoom={handleJoinGroupRoom}
                    isJoiningGroupRoom={isJoiningGroupRoom}
                    groupJoinErrorMessage={groupJoinErrorMessage}
                    groupRoomAccessMeta={
                        selectedRoom?.type === 'GROUP'
                            ? {
                                  currentParticipants:
                                      roomAccessByRoomId[selectedRoom.id]
                                          ?.currentParticipants ?? 0,
                                  maxCapacity:
                                      roomAccessByRoomId[selectedRoom.id]
                                          ?.maxCapacity ?? null,
                              }
                            : null
                    }
                    isGroupOwner={
                        selectedRoom?.type === 'GROUP' &&
                        selectedRoom.createdBy === user?.userId
                    }
                />
                {/* 우측 1:1 요청/친구 요청/요청 상태 */}
                <MessageRequestPanel
                    searchKeyword={searchKeyword}
                    searchedUsers={searchedUsers}
                    isSearchLoading={isSearchLoading}
                    isSearchLoadingMore={isSearchLoadingMore}
                    hasMoreSearchedUsers={hasMoreSearchedUsers}
                    searchErrorMessage={errorMessage}
                    onLoadMoreSearchedUsers={loadMoreSearchedUsers}
                    friendIds={friendIds}
                    friends={friends}
                    isFriendLoading={isFriendLoading}
                    isFriendLoadingMore={isFriendLoadingMore}
                    hasMoreFriends={hasMoreFriends}
                    friendErrorMessage={friendErrorMessage}
                    onLoadMoreFriends={loadMoreFriends}
                    requests={requests}
                    isRequestingDm={isRequestingDm}
                    isOpeningDm={isOpeningDm}
                    isRespondingDm={isRespondingDm}
                    isDeletingDm={isDeletingDm}
                    requestStatusErrorMessage={requestStatusErrorMessage}
                    statusClassName={statusClassName}
                    onSearchChange={setSearchKeyword}
                    onRequestDm={handleRequestDm}
                    onOpenDm={handleOpenDm}
                    onRespondDm={handleRespondDm}
                    onDeleteDm={handleDeleteDm}
                />
            </div>
            {isGroupCreateModalOpen ? (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4'>
                    <div className='w-full max-w-md rounded-xl border border-white/15 bg-slate-950 p-4 shadow-2xl'>
                        <div className='mb-4 flex items-center justify-between'>
                            <h3 className='text-base font-bold'>그룹 채팅방 생성</h3>
                            <button
                                type='button'
                                onClick={handleCloseGroupCreateModal}
                                className='rounded bg-white/10 px-2 py-1 text-xs text-white/70 hover:bg-white/20'
                            >
                                닫기
                            </button>
                        </div>

                        <div className='space-y-3'>
                            <label className='block'>
                                <div className='mb-1 text-xs text-white/70'>
                                    채팅방 이름
                                </div>
                                <input
                                    value={groupRoomName}
                                    onChange={(event) =>
                                        setGroupRoomName(event.target.value)
                                    }
                                    placeholder='예: 우리끼리 수다방'
                                    maxLength={49}
                                    required
                                    className='w-full rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/70'
                                />
                                <div className='mt-1 text-[11px] text-white/55'>
                                    필수 입력, 50자 미만
                                </div>
                            </label>

                            <label className='block'>
                                <div className='mb-1 text-xs text-white/70'>
                                    입장 비밀번호 (선택)
                                </div>
                                <input
                                    type='password'
                                    value={groupRoomPassword}
                                    onChange={(event) =>
                                        setGroupRoomPassword(event.target.value)
                                    }
                                    placeholder='없으면 비워두세요'
                                    maxLength={100}
                                    className='w-full rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/70'
                                />
                            </label>

                            <label className='block'>
                                <div className='mb-1 text-xs text-white/70'>
                                    최대 인원수
                                </div>
                                <input
                                    type='number'
                                    min={2}
                                    max={50}
                                    value={groupRoomMaxCapacity}
                                    onChange={(event) => {
                                        const next = event.target.value;
                                        if (!next) {
                                            setGroupRoomMaxCapacity('');
                                            return;
                                        }
                                        const nextNumber = Number(next);
                                        if (Number.isNaN(nextNumber)) return;
                                        setGroupRoomMaxCapacity(
                                            String(Math.min(nextNumber, 50)),
                                        );
                                    }}
                                    placeholder='예: 10'
                                    required
                                    className='w-full rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/70'
                                />
                                <div className='mt-1 text-[11px] text-white/55'>
                                    필수 입력, 2명 이상 50명 이하
                                </div>
                            </label>
                        </div>

                        <div className='mt-4 flex justify-end gap-2'>
                            <button
                                type='button'
                                onClick={handleCloseGroupCreateModal}
                                disabled={isCreatingGroupRoom}
                                className='rounded bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20'
                            >
                                취소
                            </button>
                            <button
                                type='button'
                                onClick={handleCreateGroupRoom}
                                disabled={isCreatingGroupRoom}
                                className='rounded bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400'
                            >
                                {isCreatingGroupRoom ? '생성 중...' : '생성'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </main>
    );
}
