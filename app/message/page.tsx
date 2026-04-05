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
    const [selectedImages, setSelectedImages] = useState<PendingImage[]>([]);
    const [isChatAtBottom, setIsChatAtBottom] = useState(true);
    const [isTabVisible, setIsTabVisible] = useState(true);
    const [rooms, setRooms] = useState<ChatRoomItem[]>([]);
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
    const {
        messages: dbMessages,
        sendMessage,
        uploadImageMessage,
        deleteMessage,
        isPeerTyping,
        peerTypingName,
        notifyTyping,
        stopTyping,
    } = useChat(selectedRoomId);
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
        for (const room of rooms) {
            merged.set(room.id, room);
        }
        for (const room of myDmRooms) {
            if (!merged.has(room.id)) {
                merged.set(room.id, room);
            }
        }
        return Array.from(merged.values());
    }, [rooms, myDmRooms]);

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
        if (!selectedRoomId || !user?.userId) return;
        markRoomAsRead(selectedRoomId, { force: true });
    }, [selectedRoomId, user?.userId, markRoomAsRead]);

    // 현재 방에서 새 메시지를 수신했고, 화면이 보이며 하단이면 읽음 처리
    useEffect(() => {
        if (!selectedRoomId || !user?.userId) return;
        if (!isTabVisible || !isChatAtBottom) return;
        if (!dbMessages?.length) return;
        const latest = dbMessages[dbMessages.length - 1];
        if (!latest) return;
        const latestSenderId = String(latest.sender_id ?? '');
        if (!latestSenderId || latestSenderId === user.userId) return;
        markRoomAsRead(selectedRoomId);
    }, [
        dbMessages?.length,
        isChatAtBottom,
        isTabVisible,
        markRoomAsRead,
        selectedRoomId,
        user?.userId,
    ]);

    // 탭이 다시 활성화됐고 현재 방이 보이는 상태면 읽음 처리
    useEffect(() => {
        if (!selectedRoomId || !user?.userId) return;
        if (!isTabVisible || !isChatAtBottom) return;
        markRoomAsRead(selectedRoomId);
    }, [
        isChatAtBottom,
        isTabVisible,
        markRoomAsRead,
        selectedRoomId,
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
        if ((!content && !hasSelectedImage) || !selectedRoomId || !user?.userId) {
            return;
        }

        stopTyping();
        try {
            if (hasSelectedImage) {
                setIsUploadingImage(true);
                await uploadImageMessage({
                    room_id: selectedRoomId,
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
                    room_id: selectedRoomId,
                    sender_id: user.userId,
                    sender_name: user.nickname || user.username || user.name || '나',
                    content,
                });
            }
            setRoomSummaryByRoomId((prev) => ({
                ...prev,
                [selectedRoomId]: {
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
            if (!selectedRoomId || !user?.userId) return;
            if (value.trim()) {
                notifyTyping();
                return;
            }
            stopTyping();
        },
        [notifyTyping, selectedRoomId, stopTyping, user?.userId],
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
        if (!selectedRoom || selectedRoom.type !== 'DM') return;
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
                    onSelectRoom={setSelectedRoomId}
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
                        !isPreparingImage && (!!draft.trim() || selectedImages.length > 0)
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
        </main>
    );
}
