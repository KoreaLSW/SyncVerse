import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// GET /api/chat/rooms/[id]/access
export async function GET(
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
    const roomId = String(id ?? '').trim();
    if (!roomId) {
        return NextResponse.json({ error: 'Room id is required' }, { status: 400 });
    }

    try {
        const { data: room, error: roomError } = await supabase
            .from('chat_rooms')
            .select('id, name, type, password, max_capacity')
            .eq('id', roomId)
            .maybeSingle();
        if (roomError) throw roomError;
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        const { data: participant, error: participantError } = await supabase
            .from('chat_participants')
            .select('room_id')
            .eq('room_id', roomId)
            .eq('user_id', authUser.userId)
            .maybeSingle();
        if (participantError) throw participantError;

        const { count: participantCount, error: countError } = await supabase
            .from('chat_participants')
            .select('room_id', { count: 'exact', head: true })
            .eq('room_id', roomId);
        if (countError) throw countError;

        const maxCapacity =
            typeof room.max_capacity === 'number' ? room.max_capacity : null;
        const currentParticipants = Number(participantCount ?? 0);
        const isParticipant = !!participant;
        const requiresPassword = !!String(room.password ?? '').trim();
        const isRoomFull =
            maxCapacity !== null && currentParticipants >= Number(maxCapacity);

        return NextResponse.json({
            data: {
                roomId,
                roomName: String(room.name ?? '채팅방'),
                roomType: String(room.type ?? ''),
                isParticipant,
                requiresPassword,
                maxCapacity,
                currentParticipants,
                canJoin: isParticipant || !isRoomFull,
            },
        });
    } catch (error) {
        console.error('Chat room access check error:', error);
        return NextResponse.json(
            { error: 'Failed to check room access' },
            { status: 500 },
        );
    }
}

