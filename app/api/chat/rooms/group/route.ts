import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

type GroupScope = 'all' | 'my' | 'friend' | 'others';

function normalizeScope(value: string | null): GroupScope {
    if (value === 'my' || value === 'friend' || value === 'others') return value;
    return 'all';
}

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
        const scope = normalizeScope(searchParams.get('scope'));

        const { data: rooms, error: roomsError } = await supabase
            .from('chat_rooms')
            .select('id, type, name, max_capacity, created_at, created_by')
            .eq('type', 'GROUP')
            .order('created_at', { ascending: false });
        if (roomsError) throw roomsError;

        const allGroupRooms = rooms ?? [];
        if (scope === 'all') {
            return NextResponse.json({
                data: allGroupRooms.map((room) => ({
                    id: String(room.id),
                    name: String(room.name ?? '그룹 채팅방'),
                    type: 'GROUP' as const,
                    memberCount:
                        typeof room.max_capacity === 'number'
                            ? room.max_capacity
                            : undefined,
                    unreadCount: 0,
                    latestMessage: '',
                    latestAt: '',
                    createdBy: room.created_by ? String(room.created_by) : null,
                })),
            });
        }

        const myUserId = authUser.userId;
        if (scope === 'my') {
            return NextResponse.json({
                data: allGroupRooms
                    .filter((room) => String(room.created_by ?? '') === myUserId)
                    .map((room) => ({
                        id: String(room.id),
                        name: String(room.name ?? '그룹 채팅방'),
                        type: 'GROUP' as const,
                        memberCount:
                            typeof room.max_capacity === 'number'
                                ? room.max_capacity
                                : undefined,
                        unreadCount: 0,
                        latestMessage: '',
                        latestAt: '',
                        createdBy: room.created_by ? String(room.created_by) : null,
                    })),
            });
        }

        const { data: friendships, error: friendshipsError } = await supabase
            .from('friendships')
            .select('sender_id, receiver_id')
            .eq('status', 'ACCEPTED')
            .or(`sender_id.eq.${myUserId},receiver_id.eq.${myUserId}`);
        if (friendshipsError) throw friendshipsError;

        const friendUserIds = new Set<string>();
        for (const row of friendships ?? []) {
            const senderId = String(row.sender_id ?? '');
            const receiverId = String(row.receiver_id ?? '');
            if (senderId === myUserId && receiverId) {
                friendUserIds.add(receiverId);
            } else if (receiverId === myUserId && senderId) {
                friendUserIds.add(senderId);
            }
        }

        const filtered = allGroupRooms.filter((room) => {
            const creatorId = String(room.created_by ?? '');
            if (!creatorId || creatorId === myUserId) return false;
            const isFriendCreator = friendUserIds.has(creatorId);
            if (scope === 'friend') return isFriendCreator;
            return !isFriendCreator;
        });

        return NextResponse.json({
            data: filtered.map((room) => ({
                id: String(room.id),
                name: String(room.name ?? '그룹 채팅방'),
                type: 'GROUP' as const,
                memberCount:
                    typeof room.max_capacity === 'number'
                        ? room.max_capacity
                        : undefined,
                unreadCount: 0,
                latestMessage: '',
                latestAt: '',
                createdBy: room.created_by ? String(room.created_by) : null,
            })),
        });
    } catch (error) {
        console.error('Group chat rooms fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch group chat rooms' },
            { status: 500 },
        );
    }
}

