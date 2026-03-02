import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// POST /api/notifications/[id]/act
export async function POST(
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

        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('notifications')
            .update({ acted_at: now, read_at: now })
            .eq('id', id)
            .eq('user_id', authUser.userId)
            .select(
                'id, user_id, actor_id, type, title, body, payload, source_key, read_at, acted_at, created_at, updated_at',
            )
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            data,
        });
    } catch (error) {
        console.error('Notification act error:', error);
        return NextResponse.json(
            { error: 'Failed to mark notification as acted' },
            { status: 500 },
        );
    }
}
