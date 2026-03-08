import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// DELETE /api/chat-requests/[id]
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
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

    const { id } = await context.params;
    if (!id) {
        return NextResponse.json(
            { error: 'Request id is required' },
            { status: 400 },
        );
    }

    try {
        const { data: existing, error: existingError } = await supabase
            .from('chat_requests')
            .select('id, sender_id, receiver_id, request_type')
            .eq('id', id)
            .eq('request_type', 'DM_INVITE')
            .maybeSingle();
        if (existingError) throw existingError;
        if (!existing) {
            return NextResponse.json(
                { error: 'Request not found' },
                { status: 404 },
            );
        }
        if (
            existing.sender_id !== authUser.userId &&
            existing.receiver_id !== authUser.userId
        ) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { error: deleteError } = await supabase
            .from('chat_requests')
            .delete()
            .eq('id', id);
        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Chat request delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete chat request' },
            { status: 500 },
        );
    }
}
