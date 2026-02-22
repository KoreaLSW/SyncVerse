import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// POST /api/friends/request
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
        const { receiverId } = body ?? {};

        if (!receiverId) {
            return NextResponse.json(
                { error: 'receiverId is required' },
                { status: 400 }
            );
        }
        if (receiverId === authUser.userId) {
            return NextResponse.json(
                { error: 'Cannot add yourself' },
                { status: 400 }
            );
        }

        const { data: blockData, error: blockError } = await supabase
            .from('blocks')
            .select('id')
            .or(
                `and(blocker_id.eq.${authUser.userId},blocked_id.eq.${receiverId}),and(blocker_id.eq.${receiverId},blocked_id.eq.${authUser.userId})`
            )
            .limit(1);

        if (blockError) throw blockError;
        if (blockData && blockData.length > 0) {
            return NextResponse.json(
                { error: 'Blocked relationship' },
                { status: 403 }
            );
        }

        const { data: existing, error: existingError } = await supabase
            .from('friendships')
            .select('id, sender_id, receiver_id, status')
            .or(
                `and(sender_id.eq.${authUser.userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${authUser.userId})`
            )
            .limit(1);

        if (existingError) throw existingError;

        if (existing && existing.length > 0) {
            const relation = existing[0];
            if (relation.status === 'ACCEPTED') {
                return NextResponse.json(
                    { status: 'ACCEPTED' },
                    { status: 409 }
                );
            }
            if (relation.sender_id === authUser.userId) {
                return NextResponse.json(
                    { status: 'PENDING_SENT' },
                    { status: 409 }
                );
            }

            const { data: accepted, error: acceptError } = await supabase
                .from('friendships')
                .update({ status: 'ACCEPTED' })
                .eq('id', relation.id)
                .select()
                .single();

            if (acceptError) throw acceptError;

            return NextResponse.json({
                status: 'ACCEPTED',
                data: accepted,
                autoAccepted: true,
            });
        }

        const { data, error } = await supabase
            .from('friendships')
            .insert([
                {
                    sender_id: authUser.userId,
                    receiver_id: receiverId,
                    status: 'PENDING',
                },
            ])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ status: 'PENDING_SENT', data });
    } catch (error) {
        console.error('Friend request error:', error);
        return NextResponse.json(
            { error: 'Failed to request friend' },
            { status: 500 }
        );
    }
}
