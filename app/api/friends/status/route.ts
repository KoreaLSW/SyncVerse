import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// GET /api/friends/status?userId=...
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

    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('userId');
    if (!targetId) {
        return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
        );
    }

    try {
        const { data, error } = await supabase
            .from('friendships')
            .select('id, sender_id, receiver_id, status')
            .or(
                `and(sender_id.eq.${authUser.userId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${authUser.userId})`
            )
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            return NextResponse.json({ status: 'NONE' });
        }

        const relation = data[0];
        if (relation.status === 'ACCEPTED') {
            return NextResponse.json({ status: 'ACCEPTED' });
        }
        if (relation.sender_id === authUser.userId) {
            return NextResponse.json({ status: 'PENDING_SENT' });
        }
        return NextResponse.json({ status: 'PENDING_RECEIVED' });
    } catch (error) {
        console.error('Friend status error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch friend status' },
            { status: 500 }
        );
    }
}
