'use client';
 
import { ChannelCard } from '@/components/ChannelCard';
import Link from 'next/link';
import {
    WHITEBOARD_CHANNELS,
} from '@/lib/whiteboardChannels';


export default function WhiteboardPage() {
    return (
        <main className='min-h-screen w-full bg-slate-900 text-white'>
            <div className='absolute top-4 left-4 z-20'>
                <Link
                    href='/'
                    className='rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-sm text-white backdrop-blur-md transition hover:bg-black/80'
                >
                    ← 메인으로
                </Link>
            </div>
            <div className='mx-auto max-w-3xl px-6 py-12'>
                <h1 className='text-2xl font-bold'>화이트보드 채널 선택</h1>
                <p className='mt-2 text-sm text-white/60'>
                    채널을 선택하면 해당 화이트보드로 입장합니다.
                </p>

                <div className='mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    {WHITEBOARD_CHANNELS.map((channel) => (
                        <ChannelCard
                            key={channel.id}
                            channelId={channel.id}
                            name={channel.name}
                        />
                    ))}
                </div>
            </div>
        </main>
    );
}