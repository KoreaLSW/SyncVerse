import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// POST /api/friends/remove
export async function POST(request: NextRequest) {
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
        const body = await request.json();
        const { targetId } = body ?? {};

        if (!targetId) {
            return NextResponse.json(
                { error: 'targetId is required' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('friendships')
            .delete()
            .or(
                `and(sender_id.eq.${authUser.userId},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${authUser.userId})`
            );

        if (error) throw error;

        return NextResponse.json({ success: true, status: 'NONE' });
    } catch (error) {
        console.error('Friend remove error:', error);
        return NextResponse.json(
            { error: 'Failed to remove friend' },
            { status: 500 }
        );
    }
}
