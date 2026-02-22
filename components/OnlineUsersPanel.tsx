import { useState } from 'react';

type OnlineUser = {
    id: string;
    nickname?: string | null;
};

interface OnlineUsersPanelProps {
    users: OnlineUser[];
    className?: string;
}

export function OnlineUsersPanel({
    users,
    className = '',
}: OnlineUsersPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div
            className={`max-w-[400px] bg-black/60 backdrop-blur-lg border border-white/10 rounded-xl overflow-hidden shadow-2xl text-white ${className}`}
        >
            <div className='px-3 py-2 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0 h-9'>
                <span className='text-[10px] text-white/70 font-black uppercase tracking-widest'>
                    Online Users
                </span>
                <div className='flex items-center gap-2'>
                    <span className='text-[10px] text-white/50'>
                        {users.length}명
                    </span>
                    <button
                        type='button'
                        onClick={() => setIsExpanded((prev) => !prev)}
                        className='text-[10px] text-white/60 hover:text-white/90 transition-colors'
                    >
                        {isExpanded ? 'ON' : 'OFF'}
                    </button>
                </div>
            </div>
            {isExpanded && (
                <ul className='h-[8.7rem] overflow-auto p-3 space-y-1 text-sm scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'>
                    {users.map((user, index) => (
                        <li
                            key={`${user.id}-${index}`}
                            className='truncate text-white/90'
                        >
                            {user.nickname?.trim() || '익명'}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
