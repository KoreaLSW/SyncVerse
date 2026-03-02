'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageChatSection } from '@/components/message/MessageChatSection';
import { MessageRequestPanel } from '@/components/message/MessageRequestPanel';
import { MessageRoomSidebar } from '@/components/message/MessageRoomSidebar';
import {
    DM_REQUEST_MOCK,
    FRIEND_MOCK,
    MESSAGE_MOCK,
    ROOM_FILTERS,
    ROOM_MOCK,
    SEARCH_USER_MOCK,
    statusClassName,
} from '@/lib/message/mockData';
import type { MessageItem, RoomFilter } from '@/lib/message/types';

export default function MessagePage() {
    const router = useRouter();
    const [filter, setFilter] = useState<RoomFilter>('ALL');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('main-1');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [draft, setDraft] = useState('');
    const [messagesByRoom, setMessagesByRoom] =
        useState<Record<string, MessageItem[]>>(MESSAGE_MOCK);

    const visibleRooms = useMemo(() => {
        return ROOM_MOCK.filter((room) =>
            filter === 'ALL' ? true : room.type === filter,
        );
    }, [filter]);

    const selectedRoom = useMemo(
        () => ROOM_MOCK.find((room) => room.id === selectedRoomId) ?? null,
        [selectedRoomId],
    );

    const currentMessages = messagesByRoom[selectedRoomId] ?? [];

    const searchedUsers = useMemo(() => {
        const keyword = searchKeyword.trim();
        if (!keyword) return SEARCH_USER_MOCK.slice(0, 4);
        return SEARCH_USER_MOCK.filter((name) => name.includes(keyword));
    }, [searchKeyword]);

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
                <MessageRoomSidebar
                    rooms={visibleRooms}
                    totalCount={ROOM_MOCK.length}
                    filters={ROOM_FILTERS}
                    currentFilter={filter}
                    selectedRoomId={selectedRoomId}
                    onFilterChange={setFilter}
                    onSelectRoom={setSelectedRoomId}
                />
                <MessageChatSection
                    selectedRoom={selectedRoom}
                    messages={currentMessages}
                    draft={draft}
                    onDraftChange={setDraft}
                    onSend={handleSend}
                />
                <MessageRequestPanel
                    searchKeyword={searchKeyword}
                    searchedUsers={searchedUsers}
                    friends={FRIEND_MOCK}
                    requests={DM_REQUEST_MOCK}
                    statusClassName={statusClassName}
                    onSearchChange={setSearchKeyword}
                />
            </div>
        </main>
    );
}
