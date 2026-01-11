// app/api/chat/messages/route.ts
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// 채팅 내역 가져오기
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!roomId) {
        return NextResponse.json(
            { error: 'Room ID is required' },
            { status: 400 }
        );
    }

    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false }) // 최신 메시지가 먼저 오게 정렬
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // 클라이언트에서 보여줄 때는 과거->현재 순서로 보여줘야 하므로 뒤집기
        return NextResponse.json({ data: data.reverse() });
    } catch (error) {
        console.error('Fetch messages error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}

// 메시지 저장하기
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { room_id, sender_id, sender_name, content } = body;

        const { data, error } = await supabase
            .from('messages')
            .insert([{ room_id, sender_id, sender_name, content }])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ data }, { status: 201 });
    } catch (error: any) {
        console.error('Save message error:', error);
        return NextResponse.json(
            {
                error: 'Failed to save message',
                details: error.message || error,
            },
            { status: 500 }
        );
    }
}
