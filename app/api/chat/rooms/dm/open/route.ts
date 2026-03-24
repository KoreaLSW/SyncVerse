import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

function pairKey(a: string, b: string) {
    return [a, b].sort().join(':');
}

// POST /api/chat/rooms/dm/open
export async function POST(request: NextRequest) {
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

    try {
        const body = await request.json();
        const peerUserId = String(body?.peerUserId ?? '').trim();
        if (!peerUserId) {
            return NextResponse.json(
                { error: 'peerUserId is required' },
                { status: 400 },
            );
        }
        if (peerUserId === authUser.userId) {
            return NextResponse.json(
                { error: 'Cannot open DM with yourself' },
                { status: 400 },
            );
        }

        // 친구 관계 조회
        const { data: relation, error: relationError } = await supabase
            .from('friendships')
            .select('id')
            .eq('status', 'ACCEPTED')
            .or(
                `and(sender_id.eq.${authUser.userId},receiver_id.eq.${peerUserId}),and(sender_id.eq.${peerUserId},receiver_id.eq.${authUser.userId})`,
            )
            .limit(1)
            .maybeSingle();
        if (relationError) throw relationError;
        if (!relation) {
            return NextResponse.json(
                { error: 'Friend relationship required' },
                { status: 403 },
            );
        }

        // 대화방 조회
        const roomName = `dm:${pairKey(authUser.userId, peerUserId)}`;
        const { data: existingRoom, error: existingRoomError } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('type', 'DM')
            .eq('name', roomName)
            .maybeSingle();
        if (existingRoomError) throw existingRoomError;

        // 대화방 생성
        let roomId = existingRoom?.id as string | undefined;
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
            roomId = String(createdRoom.id);
        }

        // 참여자 추가
        const now = new Date().toISOString();
        const { error: participantError } = await supabase
            .from('chat_participants')
            .upsert(
                [
                    {
                        room_id: roomId,
                        user_id: authUser.userId,
                        last_read_at: now,
                    },
                    {
                        room_id: roomId,
                        user_id: peerUserId,
                    },
                ],
                { onConflict: 'room_id,user_id', ignoreDuplicates: true },
            );
        if (participantError) throw participantError;

        // 상대방 정보 조회
        const { data: peerUser, error: peerError } = await supabase
            .from('users')
            .select('id, nickname, username')
            .eq('id', peerUserId)
            .maybeSingle();
        if (peerError) throw peerError;

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
        console.error('Open friend DM error:', error);
        return NextResponse.json(
            { error: 'Failed to open friend DM room' },
            { status: 500 },
        );
    }
}
