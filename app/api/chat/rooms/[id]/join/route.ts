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
        const body = await request.json().catch(() => ({}));
        const inputPassword = String(body?.password ?? '');

        const { data: room, error: roomError } = await supabase
            .from('chat_rooms')
            .select('id, type, category, password, max_capacity')
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

        const { data: existingParticipant, error: existingParticipantError } =
            await supabase
                .from('chat_participants')
                .select('room_id')
                .eq('room_id', id)
                .eq('user_id', authUser.userId)
                .maybeSingle();
        if (existingParticipantError) throw existingParticipantError;
        if (existingParticipant) {
            return NextResponse.json({
                success: true,
                roomId: id,
                alreadyJoined: true,
            });
        }

        const roomPassword = String(room.password ?? '').trim();
        if (roomPassword && roomPassword !== inputPassword.trim()) {
            return NextResponse.json(
                { error: 'Invalid password', code: 'WRONG_PASSWORD' },
                { status: 403 },
            );
        }

        const maxCapacity =
            typeof room.max_capacity === 'number' ? room.max_capacity : null;
        if (maxCapacity !== null) {
            const { count: participantCount, error: participantCountError } =
                await supabase
                    .from('chat_participants')
                    .select('room_id', { count: 'exact', head: true })
                    .eq('room_id', id);
            if (participantCountError) throw participantCountError;
            if (Number(participantCount ?? 0) >= maxCapacity) {
                return NextResponse.json(
                    { error: 'Room is full', code: 'ROOM_FULL' },
                    { status: 409 },
                );
            }
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
