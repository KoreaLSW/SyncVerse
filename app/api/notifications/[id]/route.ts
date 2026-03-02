import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// DELETE /api/notifications/[id]
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
            { error: 'Notification id is required' },
            { status: 400 },
        );
    }

    try {
        const { data: existing, error: existingError } = await supabase
            .from('notifications')
            .select('id')
            .eq('id', id)
            .eq('user_id', authUser.userId)
            .maybeSingle();

        if (existingError) throw existingError;
        if (!existing) {
            return NextResponse.json(
                { error: 'Notification not found' },
                { status: 404 },
            );
        }

        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id)
            .eq('user_id', authUser.userId);

        if (error) throw error;

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Notification delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete notification' },
            { status: 500 },
        );
    }
}
