// app/hooks/useChat.ts
import useSWRInfinite from 'swr/infinite'; // 🚀 변경
import { apiClient } from '@/lib/api';
import { useEffect, useMemo } from 'react'; // 🚀 useMemo 추가
import { supabase } from '../lib/supabase';

export function useChat(roomId: string) {
    const PAGE_SIZE = 20;

    // SWRInfinite를 위한 키 생성 함수
    const getKey = (pageIndex: number, previousPageData: any) => {
        if (!roomId) return null;
        // 끝에 도달했으면 더 이상 요청하지 않음
        if (previousPageData && !previousPageData.length) return null;
        return `/api/chat/messages?roomId=${roomId}&limit=${PAGE_SIZE}&offset=${
            pageIndex * PAGE_SIZE
        }`;
    };

    const { data, mutate, size, setSize, isValidating } = useSWRInfinite(
        getKey,
        (url) => apiClient.get(url).then((res) => res.data.data),
        {
            revalidateFirstPage: false,
            persistSize: true, // 페이지 사이즈 유지
        }
    );

    // 🚀 중복 제거 및 시간순 정렬 로직 적용
    const messages = useMemo(() => {
        if (!data) return [];

        // 1. 모든 페이지 데이터를 하나로 합침 (평탄화)
        const allMessages = data.flat();

        // 2. ID 기반 중복 제거
        const uniqueMap = new Map();
        allMessages.forEach((msg) => {
            if (msg && msg.id) {
                uniqueMap.set(msg.id, msg);
            }
        });

        // 3. 배열로 변환 후 생성 시간순(과거 -> 현재)으로 정렬
        // 이렇게 하면 새로 들어온 최신 메시지가 항상 배열의 끝에 위치하게 됩니다.
        return Array.from(uniqueMap.values()).sort(
            (a: any, b: any) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
        );
    }, [data]);

    const isLoadingInitialData = !data && !isValidating;
    const isLoadingMore =
        isValidating ||
        (size > 0 && data && typeof data[size - 1] === 'undefined');
    const isEmpty = data?.[0]?.length === 0;
    const isReachingEnd =
        isEmpty || (data && data[data.length - 1]?.length < PAGE_SIZE);

    // 🚀 실시간 메시지 구독 로직 추가
    useEffect(() => {
        if (!roomId) return;

        const channel = supabase
            .channel(`chat-${roomId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    // 🚀 서버를 다시 찌르지 않고 로컬 SWR 캐시만 업데이트하여 깜빡임 제거
                    mutate(
                        (currentData: any) => {
                            if (!currentData) return currentData;

                            // SWRInfinite는 [[Page0], [Page1], ...] 구조입니다.
                            // 가장 최신 페이지인 Page0에 새 메시지를 추가합니다.
                            const newData = [...currentData];
                            if (newData[0]) {
                                // 내 메시지 전송 시 이미 로컬에 반영되었을 수 있으므로 중복 체크
                                const isDuplicate = newData[0].some(
                                    (m: any) => m.id === payload.new.id
                                );
                                if (!isDuplicate) {
                                    newData[0] = [...newData[0], payload.new];
                                }
                            }
                            return newData;
                        },
                        { revalidate: false } // 🚀 이 옵션이 핵심입니다 (서버 재조회 방지)
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomId, mutate]);

    // 메시지 전송하기
    const sendMessage = async (payload: {
        room_id: string;
        sender_id: string;
        sender_name: string;
        content: string;
    }) => {
        try {
            await apiClient.post('/api/chat/messages', payload);
            mutate();
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    return {
        messages,
        isLoading: isLoadingInitialData,
        isLoadingMore,
        isReachingEnd,
        loadMore: () => setSize(size + 1),
        sendMessage,
        mutate,
    };
}
