import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// POST /api/chat/rooms/[id]/read
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

        const readAt = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('chat_participants')
            .update({ last_read_at: readAt })
            .eq('room_id', id)
            .eq('user_id', authUser.userId);
        if (updateError) throw updateError;

        return NextResponse.json({ success: true, roomId: id, readAt });
    } catch (error) {
        console.error('Chat room read error:', error);
        return NextResponse.json(
            { error: 'Failed to update chat room read state' },
            { status: 500 },
        );
    }
}
