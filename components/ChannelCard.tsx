type ChannelCardProps = {
    channelId: string;
    name: string;
};

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useYjs } from '@/hooks/useYjs';

import {
    MAX_USERS_PER_CHANNEL,
    getWhiteboardDocName,
} from '@/lib/whiteboardChannels';

export function ChannelCard({ channelId, name }: ChannelCardProps) {
    const router = useRouter();
    const docName = useMemo(
        () => getWhiteboardDocName(channelId),
        [channelId]
    );
    const yjsState = useYjs(docName);
    const [userCount, setUserCount] = useState(0);

    useEffect(() => {
        if (!yjsState?.awareness) return;
        const awareness = yjsState.awareness;

        const updateCount = () => {
            const states = awareness.getStates();
            setUserCount(states.size);
        };

        // 채널 목록 페이지에서는 로컬 사용자를 카운트하지 않음
        awareness.setLocalState(null);
        updateCount();

        awareness.on('change', updateCount);
        return () => awareness.off('change', updateCount);
    }, [yjsState]);

    const isFull = userCount >= MAX_USERS_PER_CHANNEL;
    return (
        <div className='rounded-xl border border-white/10 bg-black/60 backdrop-blur-lg p-4 shadow-2xl'>
            <div className='flex items-center justify-between'>
                <div className='text-white text-lg font-semibold'>{name}</div>
                <div className='text-xs text-white/60'>
                    {userCount}/{MAX_USERS_PER_CHANNEL}명
                </div>
            </div>
            <button
                className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isFull
                        ? 'bg-white/10 text-white/40 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                onClick={() => {
                    
                    if (!isFull) router.push(`/whiteboard/${channelId}`);
                }}
                disabled={isFull}
            >
                {isFull ? '정원 초과' : '입장하기'}
            </button>
        </div>
    );
}