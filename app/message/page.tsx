'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageChatSection } from '@/components/message/MessageChatSection';
import { MessageRequestPanel } from '@/components/message/MessageRequestPanel';
import { MessageRoomSidebar } from '@/components/message/MessageRoomSidebar';
import { useChatRequests } from '@/hooks/useChatRequests';
import { useFriendList } from '@/hooks/useFriendList';
import { useUserSearch } from '@/hooks/useUserSearch';
import {
    MESSAGE_MOCK,
    ROOM_FILTERS,
    ROOM_MOCK,
    statusClassName,
} from '@/lib/message/mockData';
import type { ChatRoomItem, MessageItem, RoomFilter } from '@/lib/message/types';

export default function MessagePage() {
    const router = useRouter();
    const [filter, setFilter] = useState<RoomFilter>('ALL');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('main-1');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [draft, setDraft] = useState('');
    const [rooms, setRooms] = useState<ChatRoomItem[]>(ROOM_MOCK);
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
    const [messagesByRoom, setMessagesByRoom] =
        useState<Record<string, MessageItem[]>>(MESSAGE_MOCK);

    const visibleRooms = useMemo(() => {
        return rooms.filter((room) =>
            filter === 'ALL' ? true : room.type === filter,
        );
    }, [filter, rooms]);

    const selectedRoom = useMemo(
        () => rooms.find((room) => room.id === selectedRoomId) ?? null,
        [selectedRoomId, rooms],
    );

    const currentMessages = messagesByRoom[selectedRoomId] ?? [];

    const handleSend = () => {
        const content = draft.trim();
        if (!content || !selectedRoomId) return;
        const next: MessageItem = {
            id: `local-${Date.now()}`,
            sender: '나',
            content,
            createdAt: '방금',
            isMine: true,
        };
        setMessagesByRoom((prev) => ({
            ...prev,
            [selectedRoomId]: [...(prev[selectedRoomId] ?? []), next],
        }));
        setDraft('');
    };

    const handleRequestDm = async (receiverId: string) => {
        try {
            await requestDm(receiverId);
        } catch (error: any) {
            const message =
                error?.response?.status === 409
                    ? '이미 진행 중인 1:1 요청이 있습니다.'
                    : '1:1 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
            alert(message);
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
                setMessagesByRoom((prev) =>
                    prev[roomId] ? prev : { ...prev, [roomId]: [] },
                );
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
                    totalCount={rooms.length}
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
                    onDraftChange={setDraft}
                    onSend={handleSend}
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
                    isRespondingDm={isRespondingDm}
                    isDeletingDm={isDeletingDm}
                    requestStatusErrorMessage={requestStatusErrorMessage}
                    statusClassName={statusClassName}
                    onSearchChange={setSearchKeyword}
                    onRequestDm={handleRequestDm}
                    onRespondDm={handleRespondDm}
                    onDeleteDm={handleDeleteDm}
                />
            </div>
        </main>
    );
}
