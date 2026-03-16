import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

type RoomSummaryItem = {
    roomId: string;
    latestMessage: string;
    latestAt: string;
    unreadCount: number;
};

function parseRoomIds(searchParams: URLSearchParams) {
    const roomIdsRaw = searchParams.get('roomIds') ?? '';
    return Array.from(
        new Set(
            roomIdsRaw
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
        ),
    );
}

// GET /api/chat/rooms/summary?roomIds=<id1,id2,...>
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
        const roomIds = parseRoomIds(searchParams);
        if (!roomIds.length) {
            return NextResponse.json({ data: [] });
        }

        const { data: participants, error: participantsError } = await supabase
            .from('chat_participants')
            .select('room_id, last_read_at')
            .eq('user_id', authUser.userId)
            .in('room_id', roomIds);
        if (participantsError) throw participantsError;

        const participantRows = participants ?? [];
        const joinedRoomIds = participantRows.map((row) => String(row.room_id));
        if (!joinedRoomIds.length) {
            return NextResponse.json({ data: [] });
        }

        const lastReadByRoomId = new Map<string, number>();
        let oldestLastRead = Date.now();
        for (const row of participantRows) {
            const roomId = String(row.room_id);
            const readAtMs = row.last_read_at
                ? new Date(String(row.last_read_at)).getTime()
                : 0;
            lastReadByRoomId.set(roomId, Number.isNaN(readAtMs) ? 0 : readAtMs);
            if (!Number.isNaN(readAtMs) && readAtMs < oldestLastRead) {
                oldestLastRead = readAtMs;
            }
        }

        const oldestLastReadIso = new Date(
            Number.isFinite(oldestLastRead) ? oldestLastRead : 0,
        ).toISOString();

        const { data: latestMessages, error: latestMessagesError } = await supabase
            .from('messages')
            .select('room_id, content, created_at')
            .in('room_id', joinedRoomIds)
            .order('created_at', { ascending: false })
            .limit(500);
        if (latestMessagesError) throw latestMessagesError;

        const latestByRoomId = new Map<
            string,
            { latestMessage: string; latestAt: string }
        >();
        for (const row of latestMessages ?? []) {
            const roomId = String(row.room_id ?? '');
            if (!roomId || latestByRoomId.has(roomId)) continue;
            latestByRoomId.set(roomId, {
                latestMessage: String(row.content ?? ''),
                latestAt: row.created_at ? String(row.created_at) : '',
            });
        }

        const { data: unreadMessages, error: unreadMessagesError } = await supabase
            .from('messages')
            .select('room_id, created_at, sender_id')
            .in('room_id', joinedRoomIds)
            .neq('sender_id', authUser.userId)
            .gt('created_at', oldestLastReadIso)
            .order('created_at', { ascending: false })
            .limit(3000);
        if (unreadMessagesError) throw unreadMessagesError;

        const unreadCountByRoomId = new Map<string, number>();
        for (const row of unreadMessages ?? []) {
            const roomId = String(row.room_id ?? '');
            if (!roomId) continue;
            const createdAtMs = row.created_at
                ? new Date(String(row.created_at)).getTime()
                : 0;
            const lastReadMs = lastReadByRoomId.get(roomId) ?? 0;
            if (createdAtMs <= lastReadMs) continue;
            unreadCountByRoomId.set(roomId, (unreadCountByRoomId.get(roomId) ?? 0) + 1);
        }

        const data: RoomSummaryItem[] = joinedRoomIds.map((roomId) => ({
            roomId,
            latestMessage: latestByRoomId.get(roomId)?.latestMessage ?? '',
            latestAt: latestByRoomId.get(roomId)?.latestAt ?? '',
            unreadCount: unreadCountByRoomId.get(roomId) ?? 0,
        }));

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Chat room summary error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chat room summary' },
            { status: 500 },
        );
    }
}
