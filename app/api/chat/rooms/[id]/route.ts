import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// DELETE /api/chat/rooms/[id]
// 요청에 맞춰 방 + 메시지(연쇄 삭제)까지 삭제
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.authType === 'guest') {
        return NextResponse.json({ error: 'Guest not allowed' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: 'Room id is required' }, { status: 400 });
    }

    try {
        const { data: room, error: roomError } = await supabase
            .from('chat_rooms')
            .select('id, type')
            .eq('id', id)
            .maybeSingle();
        if (roomError) throw roomError;
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }
        if (room.type !== 'DM') {
            return NextResponse.json(
                { error: 'Only DM rooms can be deleted here' },
                { status: 403 },
            );
        }

        const { data: participant, error: participantError } = await supabase
            .from('chat_participants')
            .select('room_id')
            .eq('room_id', id)
            .eq('user_id', authUser.userId)
            .maybeSingle();
        if (participantError) throw participantError;
        if (!participant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // messages / chat_participants는 FK cascade로 함께 삭제됨
        const { error: deleteError } = await supabase
            .from('chat_rooms')
            .delete()
            .eq('id', id);
        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, roomId: id });
    } catch (error) {
        console.error('Chat room delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete chat room' },
            { status: 500 },
        );
    }
}
