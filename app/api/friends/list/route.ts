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

        return NextResponse.json({ data: friendIds });
    } catch (error) {
        console.error('Friend list error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch friend list' },
            { status: 500 }
        );
    }
}
