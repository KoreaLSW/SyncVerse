import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// POST /api/friends/accept
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
        const { senderId } = body ?? {};

        if (!senderId) {
            return NextResponse.json(
                { error: 'senderId is required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('friendships')
            .update({ status: 'ACCEPTED' })
            .eq('sender_id', senderId)
            .eq('receiver_id', authUser.userId)
            .eq('status', 'PENDING')
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return NextResponse.json(
                { error: 'Friend request not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ status: 'ACCEPTED', data });
    } catch (error) {
        console.error('Friend accept error:', error);
        return NextResponse.json(
            { error: 'Failed to accept friend request' },
            { status: 500 }
        );
    }
}
