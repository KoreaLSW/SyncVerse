// app/api/chat/rooms/route.ts
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 예: MAIN

    try {
        let query = supabase.from('chat_rooms').select('*');

        // 카테고리가 지정된 경우 필터링 (예: /api/chat/rooms?category=MAIN)
        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) throw error;

        // 메인 광장을 찾는 경우 첫 번째 항목 반환
        if (category === 'MAIN') {
            return NextResponse.json({ data: data[0] });
        }

        return NextResponse.json({ data });
    } catch (error) {
        return NextResponse.json(
            { error: '채팅방 정보를 가져오는데 실패했습니다.' },
            { status: 500 }
        );
    }
}
