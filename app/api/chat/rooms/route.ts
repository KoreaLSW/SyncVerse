// app/api/chat/rooms/route.ts
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); // 예: MAIN
    const name = searchParams.get('name'); // 예: channel-1

    try {
        let query = supabase.from('chat_rooms').select('*');

        // 카테고리가 지정된 경우 필터링 (예: /api/chat/rooms?category=MAIN)
        if (category) {
            query = query.eq('category', category);
        }
        // 이름이 지정된 경우 필터링 (예: /api/chat/rooms?category=WHITEBOARD&name=channel-1)
        if (name) {
            query = query.eq('name', name);
        }

        const { data, error } = await query;

        if (error) throw error;

        // 단일 방을 찾는 경우 첫 번째 항목 반환
        if (category === 'MAIN' || name) {
            return NextResponse.json({ data: data[0] ?? null });
        }

        return NextResponse.json({ data });
    } catch (error) {
        return NextResponse.json(
            { error: '채팅방 정보를 가져오는데 실패했습니다.' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, category, name, password, max_capacity } = body;

        if (!type || !category || !name) {
            return NextResponse.json(
                { error: 'type, category, name are required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('chat_rooms')
            .insert([
                {
                    type,
                    category,
                    name,
                    password,
                    max_capacity,
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: '채팅방 생성에 실패했습니다.',
                details: error.message || error,
            },
            { status: 500 }
        );
    }
}
