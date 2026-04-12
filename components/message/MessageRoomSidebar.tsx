import type { ChatRoomItem, RoomFilter } from '@/lib/message/types';

type GroupScope = 'ALL' | 'MY' | 'FRIEND' | 'OTHERS';

type MessageRoomSidebarProps = {
    rooms: ChatRoomItem[];
    totalCount: number;
    filters: RoomFilter[];
    currentFilter: RoomFilter;
    selectedRoomId: string;
    onFilterChange: (filter: RoomFilter) => void;
    onSelectRoom: (roomId: string) => void;
    onCreateGroup?: () => void;
    groupScopes?: Array<{ value: GroupScope; label: string }>;
    currentGroupScope?: GroupScope;
    onGroupScopeChange?: (scope: GroupScope) => void;
};

export function MessageRoomSidebar({
    rooms,
    totalCount,
    filters,
    currentFilter,
    selectedRoomId,
    onFilterChange,
    onSelectRoom,
    onCreateGroup,
    groupScopes,
    currentGroupScope,
    onGroupScopeChange,
}: MessageRoomSidebarProps) {
    return (
        <section className='rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-md'>
            <div className='mb-3 flex items-center justify-between'>
                <h1 className='text-lg font-bold'>메시지</h1>
                <span className='text-xs text-white/60'>전체 {totalCount}개</span>
            </div>

            <div className='mb-3 flex flex-wrap gap-1'>
                {filters.map((value) => (
                    <button
                        key={value}
                        type='button'
                        onClick={() => onFilterChange(value)}
                        className={`rounded px-2 py-1 text-xs transition-colors ${
                            currentFilter === value
                                ? 'bg-blue-500/90 text-white'
                                : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                    >
                        {value}
                    </button>
                ))}
            </div>
            {currentFilter === 'GROUP' ? (
                <div className='mb-3 space-y-2'>
                    <button
                        type='button'
                        onClick={() => onCreateGroup?.()}
                        className='w-full rounded-md border border-cyan-300/25 bg-cyan-500/20 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/30'
                    >
                        + 그룹 채팅방 생성
                    </button>
                    {groupScopes?.length ? (
                        <div className='grid grid-cols-2 gap-1'>
                            {groupScopes.map((scope) => (
                                <button
                                    key={scope.value}
                                    type='button'
                                    onClick={() => onGroupScopeChange?.(scope.value)}
                                    className={`rounded px-2 py-1 text-xs transition-colors ${
                                        currentGroupScope === scope.value
                                            ? 'bg-blue-500/90 text-white'
                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                    }`}
                                >
                                    {scope.label}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className='max-h-[65vh] space-y-2 overflow-y-auto pr-1'>
                {rooms.map((room) => (
                    <button
                        key={room.id}
                        type='button'
                        onClick={() => onSelectRoom(room.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                            selectedRoomId === room.id
                                ? 'border-blue-400/60 bg-blue-500/20'
                                : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                    >
                        <div className='mb-1 flex items-center justify-between gap-2'>
                            <span className='font-semibold'>{room.name}</span>
                            <span className='text-[11px] text-white/50'>
                                {room.latestAt}
                            </span>
                        </div>
                        <div className='line-clamp-1 text-xs text-white/60'>
                            {room.latestMessage}
                        </div>
                        <div className='mt-2 flex items-center gap-2 text-[11px] text-white/50'>
                            <span className='rounded bg-white/10 px-1.5 py-0.5'>
                                {room.type}
                            </span>
                            {room.memberCount ? <span>{room.memberCount}명</span> : null}
                            {room.unreadCount > 0 ? (
                                <span className='ml-auto rounded bg-rose-500/90 px-1.5 py-0.5 font-semibold text-white'>
                                    {room.unreadCount}
                                </span>
                            ) : null}
                        </div>
                    </button>
                ))}
            </div>
        </section>
    );
}
