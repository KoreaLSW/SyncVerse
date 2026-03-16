import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// POST /api/chat/rooms/[id]/join
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
            .select('id, type, category')
            .eq('id', id)
            .maybeSingle();
        if (roomError) throw roomError;
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }
        if (room.type === 'DM') {
            return NextResponse.json(
                { error: 'DM rooms cannot be joined directly' },
                { status: 403 },
            );
        }

        const { error: upsertError } = await supabase
            .from('chat_participants')
            .upsert(
                {
                    room_id: id,
                    user_id: authUser.userId,
                    last_read_at: new Date().toISOString(),
                },
                {
                    onConflict: 'room_id,user_id',
                    ignoreDuplicates: true,
                },
            );
        if (upsertError) throw upsertError;

        return NextResponse.json({ success: true, roomId: id });
    } catch (error) {
        console.error('Chat room join error:', error);
        return NextResponse.json(
            { error: 'Failed to join chat room' },
            { status: 500 },
        );
    }
}
