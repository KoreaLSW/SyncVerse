import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

function pairKey(a: string, b: string) {
    return [a, b].sort().join(':');
}

// POST /api/chat-requests/[id]/respond
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.authType === 'guest') {
        return NextResponse.json(
            { error: 'Guest not allowed' },
            { status: 403 },
        );
    }

    const { id } = await context.params;
    if (!id) {
        return NextResponse.json(
            { error: 'Request id is required' },
            { status: 400 },
        );
    }

    try {
        const body = await request.json();
        const action =
            body?.action === 'accept'
                ? 'accept'
                : body?.action === 'cancel'
                  ? 'cancel'
                  : 'reject';
        const isCancelAction = action === 'cancel';

        const { data: existing, error: existingError } = await supabase
            .from('chat_requests')
            .select('id, sender_id, receiver_id, status, request_type')
            .eq('id', id)
            .eq('request_type', 'DM_INVITE')
            .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) {
            return NextResponse.json(
                { error: 'Request not found' },
                { status: 404 },
            );
        }
        if (
            existing.sender_id !== authUser.userId &&
            existing.receiver_id !== authUser.userId
        ) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (existing.status !== 'PENDING') {
            return NextResponse.json(
                { error: 'Request already handled' },
                { status: 409 },
            );
        }

        const now = new Date().toISOString();

        if (isCancelAction) {
            if (existing.sender_id !== authUser.userId) {
                return NextResponse.json(
                    { error: 'Only sender can cancel' },
                    { status: 403 },
                );
            }
            const { error: updateError } = await supabase
                .from('chat_requests')
                .update({ status: 'CANCELED', responded_at: now })
                .eq('id', id);
            if (updateError) throw updateError;

            return NextResponse.json({ success: true });
        }

        if (existing.receiver_id !== authUser.userId) {
            return NextResponse.json(
                { error: 'Only receiver can respond' },
                { status: 403 },
            );
        }

        if (action === 'reject') {
            const { error: updateError } = await supabase
                .from('chat_requests')
                .update({ status: 'REJECTED', responded_at: now })
                .eq('id', id);
            if (updateError) throw updateError;

            return NextResponse.json({ success: true });
        }

        const roomName = `dm:${pairKey(existing.sender_id, existing.receiver_id)}`;
        const { data: room, error: roomQueryError } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('type', 'DM')
            .eq('name', roomName)
            .maybeSingle();
        if (roomQueryError) throw roomQueryError;

        let roomId = room?.id as string | undefined;
        if (!roomId) {
            const { data: createdRoom, error: createRoomError } = await supabase
                .from('chat_rooms')
                .insert({
                    type: 'DM',
                    category: 'NONE',
                    name: roomName,
                })
                .select('id')
                .single();
            if (createRoomError) throw createRoomError;
            roomId = createdRoom.id as string;
        }

        const { error: participantsError } = await supabase
            .from('chat_participants')
            .upsert(
                [
                    { room_id: roomId, user_id: existing.sender_id },
                    { room_id: roomId, user_id: existing.receiver_id },
                ],
                {
                    onConflict: 'room_id,user_id',
                    ignoreDuplicates: true,
                },
            );
        if (participantsError) throw participantsError;

        const { error: updateError } = await supabase
            .from('chat_requests')
            .update({
                status: 'ACCEPTED',
                responded_at: now,
                resolved_room_id: roomId,
            })
            .eq('id', id);
        if (updateError) throw updateError;

        const peerId = String(existing.sender_id);
        const { data: peerUser } = await supabase
            .from('users')
            .select('id, nickname, username')
            .eq('id', peerId)
            .maybeSingle();

        return NextResponse.json({
            success: true,
            roomId,
            peer: peerUser
                ? {
                      id: String(peerUser.id),
                      nickname: String(peerUser.nickname ?? ''),
                      username: String(peerUser.username ?? ''),
                  }
                : null,
        });
    } catch (error) {
        console.error('Chat request respond error:', error);
        return NextResponse.json(
            { error: 'Failed to respond chat request' },
            { status: 500 },
        );
    }
}
