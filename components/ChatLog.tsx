// app/components/ChatLog.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import { ChatInput } from './ChatInput';

interface ChatLogProps {
    roomId: string;
    onSendMessage: (content: string) => void;
}

// 🚀 닉네임별 고유 색상을 생성하는 함수
const getNicknameColor = (name: string) => {
    const colors = [
        'text-blue-400',
        'text-green-400',
        'text-yellow-400',
        'text-pink-400',
        'text-purple-400',
        'text-orange-400',
        'text-cyan-400',
        'text-emerald-400',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export function ChatLog({ roomId, onSendMessage }: ChatLogProps) {
    const { messages, isLoading, isLoadingMore, isReachingEnd, loadMore } =
        useChat(roomId);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const prevScrollHeightRef = useRef<number>(0);

    // 스크롤 이벤트 핸들러
    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

        // 상단에 거의 닿았을 때 (10px 여유) 이전 메시지 로드
        if (scrollTop <= 10 && !isLoadingMore && !isReachingEnd) {
            prevScrollHeightRef.current = scrollHeight;
            loadMore();
        }

        // 바닥에 있는지 여부 체크 (10px 여유)
        setIsAtBottom(scrollHeight - scrollTop <= clientHeight + 10);
    };

    // 데이터 로드 후 스크롤 위치 보정
    useEffect(() => {
        if (!scrollRef.current) return;
        const { scrollHeight } = scrollRef.current;

        // 이전 메시지를 불러온 경우 (상단 스크롤 중)
        if (prevScrollHeightRef.current > 0 && !isLoadingMore) {
            const heightDiff = scrollHeight - prevScrollHeightRef.current;
            scrollRef.current.scrollTop = heightDiff;
            prevScrollHeightRef.current = 0;
        }
        // 새 메시지가 왔을 때 (바닥에 있었던 경우만)
        else if (isAtBottom) {
            scrollRef.current.scrollTop = scrollHeight;
        }
    }, [messages, isLoadingMore]);

    // 초기 로딩 시 또는 새 메시지 전송 시 바닥으로 강제 이동
    useEffect(() => {
        if (scrollRef.current && isAtBottom) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [isLoading]);

    // 🚀 시간 포맷팅 함수 (오전/오후 HH:mm)
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    };

    if (isLoading && messages.length === 0) return null;

    return (
        <div className='flex flex-col gap-2 w-full max-w-[400px] animate-in fade-in slide-in-from-left-4 duration-500'>
            {/* 채팅 로그 영역 */}
            <div className='bg-black/60 backdrop-blur-lg border border-white/10 rounded-xl h-60 flex flex-col overflow-hidden shadow-2xl'>
                <div className='px-3 py-2 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0 h-9'>
                    <span className='text-[10px] text-white/70 font-black uppercase tracking-widest'>
                        Live Chat
                    </span>
                    <div className='flex items-center gap-2'>
                        {/* 🚀 로딩 중일 때 레이아웃 흔들림 방지 */}
                        {isLoadingMore && (
                            <span className='text-[8px] text-white/30 animate-pulse'>
                                LOADING
                            </span>
                        )}
                        <span className='w-2 h-2 rounded-full bg-green-500 animate-pulse' />
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className='flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'
                >
                    {/* 로딩 인디케이터 (상단) */}
                    {isLoadingMore && (
                        <div className='text-center py-2'>
                            <span className='text-[10px] text-white/30 animate-pulse'>
                                이전 메시지 로딩 중...
                            </span>
                        </div>
                    )}

                    {messages.map((msg: any) => (
                        <div
                            key={msg.id}
                            className='group flex flex-col gap-0.5'
                        >
                            <div className='flex items-baseline gap-2'>
                                <span
                                    className={`text-[13px] font-bold ${getNicknameColor(
                                        msg.sender_name
                                    )}`}
                                >
                                    {msg.sender_name}
                                </span>
                                <span className='text-[10px] text-white/30 group-hover:text-white/50 transition-colors'>
                                    {formatTime(msg.created_at)}
                                </span>
                            </div>
                            <div className='text-[14px] text-white/90 leading-relaxed break-words bg-white/5 px-2 py-1 rounded-md border border-white/5 w-fit max-w-full'>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {messages.length === 0 && !isLoadingMore && (
                        <div className='h-full flex flex-col items-center justify-center opacity-30'>
                            <div className='text-xs'>아직 대화가 없습니다.</div>
                        </div>
                    )}
                </div>
            </div>

            {/* 채팅 입력 영역 */}
            <div className='w-full shadow-lg'>
                <ChatInput onSendMessage={onSendMessage} />
            </div>
        </div>
    );
}
