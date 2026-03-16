import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

type RoomTypeParam = 'DM' | 'GROUP' | 'MAIN' | null;

function normalizeTypeParam(value: string | null): RoomTypeParam {
    if (value === 'DM' || value === 'GROUP' || value === 'MAIN') return value;
    return null;
}

// GET /api/chat/rooms/my?type=DM
export async function GET(request: NextRequest) {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.authType === 'guest') {
        return NextResponse.json({ error: 'Guest not allowed' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const roomType = normalizeTypeParam(searchParams.get('type'));

        const { data: participants, error: participantsError } = await supabase
            .from('chat_participants')
            .select('room_id')
            .eq('user_id', authUser.userId);
        if (participantsError) throw participantsError;

        const roomIds = Array.from(
            new Set((participants ?? []).map((row) => String(row.room_id))),
        );
        if (!roomIds.length) {
            return NextResponse.json({ data: [] });
        }

        let roomQuery = supabase
            .from('chat_rooms')
            .select('id, type, name, created_at')
            .in('id', roomIds)
            .order('created_at', { ascending: false });
        if (roomType) {
            roomQuery = roomQuery.eq('type', roomType);
        }

        const { data: rooms, error: roomsError } = await roomQuery;
        if (roomsError) throw roomsError;

        const targetRoomIds = (rooms ?? []).map((room) => String(room.id));
        const isDm = roomType === 'DM' || roomType === null;

        const peersByRoomId = new Map<string, string>();
        if (isDm && targetRoomIds.length) {
            const { data: peerParticipants, error: peerParticipantsError } =
                await supabase
                    .from('chat_participants')
                    .select('room_id, user_id')
                    .in('room_id', targetRoomIds)
                    .neq('user_id', authUser.userId);
            if (peerParticipantsError) throw peerParticipantsError;

            const peerUserIds = Array.from(
                new Set(
                    (peerParticipants ?? []).map((row) => String(row.user_id)),
                ),
            );

            let userMap = new Map<string, { nickname: string; username: string }>();
            if (peerUserIds.length) {
                const { data: users, error: usersError } = await supabase
                    .from('users')
                    .select('id, nickname, username')
                    .in('id', peerUserIds);
                if (usersError) throw usersError;
                userMap = new Map(
                    (users ?? []).map((user) => [
                        String(user.id),
                        {
                            nickname: String(user.nickname ?? ''),
                            username: String(user.username ?? ''),
                        },
                    ]),
                );
            }

            for (const row of peerParticipants ?? []) {
                const roomId = String(row.room_id ?? '');
                const peerId = String(row.user_id ?? '');
                if (!roomId || !peerId || peersByRoomId.has(roomId)) continue;
                const peer = userMap.get(peerId);
                const displayName = peer?.nickname || peer?.username || '1:1 대화';
                peersByRoomId.set(roomId, displayName);
            }
        }

        const data = (rooms ?? []).map((room) => {
            const id = String(room.id);
            const type = String(room.type) as 'DM' | 'GROUP' | 'MAIN';
            return {
                id,
                name:
                    type === 'DM'
                        ? peersByRoomId.get(id) || '1:1 대화'
                        : String(room.name ?? '채팅방'),
                type,
                unreadCount: 0,
                latestMessage: '',
                latestAt: '',
            };
        });

        return NextResponse.json({ data });
    } catch (error) {
        console.error('My chat rooms fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch my chat rooms' },
            { status: 500 },
        );
    }
}
