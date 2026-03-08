import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// GET /api/friends/list
export async function GET(request: NextRequest) {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser?.userId) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }
    if (authUser.authType === 'guest') {
        return NextResponse.json(
            { error: 'Guest not allowed' },
            { status: 403 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const hasPaginationParam =
            searchParams.has('limit') || searchParams.has('offset');
        const limitRaw = Number(searchParams.get('limit') ?? 10);
        const offsetRaw = Number(searchParams.get('offset') ?? 0);
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(limitRaw, 1), 50)
            : 10;
        const offset = Number.isFinite(offsetRaw)
            ? Math.max(offsetRaw, 0)
            : 0;

        const { data, error } = await supabase
            .from('friendships')
            .select('sender_id, receiver_id, status')
            .eq('status', 'ACCEPTED')
            .or(
                `sender_id.eq.${authUser.userId},receiver_id.eq.${authUser.userId}`
            );

        if (error) throw error;

        const friendIds =
            data?.map((row) =>
                row.sender_id === authUser.userId
                    ? row.receiver_id
                    : row.sender_id
            ) ?? [];

        const uniqueFriendIds = Array.from(new Set(friendIds));
        if (uniqueFriendIds.length === 0) {
            return NextResponse.json({
                data: uniqueFriendIds,
                friends: [],
                hasMore: false,
                nextOffset: offset,
            });
        }

        const { data: friendUsers, error: friendUsersError } = await supabase
            .from('users')
            .select('id, username, nickname')
            .in('id', uniqueFriendIds);

        if (friendUsersError) throw friendUsersError;

        const allFriends = (friendUsers ?? []).sort((a, b) =>
            String(a.nickname ?? '').localeCompare(String(b.nickname ?? '')),
        );
        if (!hasPaginationParam) {
            return NextResponse.json({
                data: uniqueFriendIds,
                friends: allFriends,
                hasMore: false,
                nextOffset: allFriends.length,
            });
        }

        const pagedFriends = allFriends.slice(offset, offset + limit);
        const nextOffset = offset + pagedFriends.length;
        const hasMore = nextOffset < allFriends.length;

        return NextResponse.json({
            data: uniqueFriendIds,
            friends: pagedFriends,
            hasMore,
            nextOffset,
        });
    } catch (error) {
        console.error('Friend list error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch friend list' },
            { status: 500 }
        );
    }
}
