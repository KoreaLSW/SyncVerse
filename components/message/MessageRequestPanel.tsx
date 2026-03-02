import type { DmRequestItem } from '@/lib/message/types';

type MessageRequestPanelProps = {
    searchKeyword: string;
    searchedUsers: string[];
    friends: string[];
    requests: DmRequestItem[];
    statusClassName: (status: DmRequestItem['status']) => string;
    onSearchChange: (value: string) => void;
};

export function MessageRequestPanel({
    searchKeyword,
    searchedUsers,
    friends,
    requests,
    statusClassName,
    onSearchChange,
}: MessageRequestPanelProps) {
    return (
        <section className='rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-md'>
            <h3 className='text-sm font-bold mb-2'>1:1 대화 요청</h3>
            <div className='mb-3'>
                <input
                    value={searchKeyword}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder='유저 검색'
                    className='w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-blue-400/70'
                />
            </div>
            <div className='mb-4 space-y-2'>
                {searchedUsers.map((name) => (
                    <div
                        key={`search-${name}`}
                        className='flex items-center justify-between rounded bg-white/5 px-3 py-2'
                    >
                        <span className='text-sm'>{name}</span>
                        <button
                            type='button'
                            className='rounded bg-blue-500/90 px-2 py-1 text-xs font-semibold hover:bg-blue-400'
                        >
                            1:1 요청
                        </button>
                    </div>
                ))}
            </div>

            <h4 className='text-sm font-bold mb-2'>친구 목록에서 요청</h4>
            <div className='mb-4 space-y-2'>
                {friends.map((name) => (
                    <div
                        key={`friend-${name}`}
                        className='flex items-center justify-between rounded bg-white/5 px-3 py-2'
                    >
                        <span className='text-sm'>{name}</span>
                        <button
                            type='button'
                            className='rounded bg-emerald-500/90 px-2 py-1 text-xs font-semibold hover:bg-emerald-400'
                        >
                            대화 열기
                        </button>
                    </div>
                ))}
            </div>

            <h4 className='text-sm font-bold mb-2'>요청 상태</h4>
            <div className='space-y-2 max-h-[28vh] overflow-y-auto pr-1'>
                {requests.map((item) => (
                    <div
                        key={item.id}
                        className='rounded border border-white/10 bg-white/5 px-3 py-2'
                    >
                        <div className='mb-1 flex items-center justify-between'>
                            <span className='text-sm'>{item.target}</span>
                            <span
                                className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusClassName(
                                    item.status,
                                )}`}
                            >
                                {item.status}
                            </span>
                        </div>
                        <div className='text-[11px] text-white/50'>
                            {item.createdAt}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
