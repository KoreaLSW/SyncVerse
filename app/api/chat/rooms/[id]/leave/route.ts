import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// POST /api/chat/rooms/[id]/leave
// 그룹 채팅방 참여자는 나가기 처리(본인 participant 삭제)
export async function POST(
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
            .select('id, type, created_by')
            .eq('id', id)
            .maybeSingle();
        if (roomError) throw roomError;
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }
        if (room.type !== 'GROUP') {
            return NextResponse.json(
                { error: 'Only GROUP rooms can be left here' },
                { status: 403 },
            );
        }

        const ownerId = String(room.created_by ?? '');
        if (ownerId && ownerId === authUser.userId) {
            return NextResponse.json(
                { error: 'Owner should delete room instead of leaving', code: 'OWNER_DELETE_REQUIRED' },
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
            return NextResponse.json({
                success: true,
                action: 'left',
                roomId: id,
                alreadyLeft: true,
            });
        }

        const { error: deleteError } = await supabase
            .from('chat_participants')
            .delete()
            .eq('room_id', id)
            .eq('user_id', authUser.userId);
        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, action: 'left', roomId: id });
    } catch (error) {
        console.error('Group room leave error:', error);
        return NextResponse.json(
            { error: 'Failed to leave group room' },
            { status: 500 },
        );
    }
}

