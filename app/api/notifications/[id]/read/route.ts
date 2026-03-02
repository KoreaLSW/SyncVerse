import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// PATCH /api/notifications/[id]/read
// 알림 읽음 처리
export async function PATCH(
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
            .select('id, read_at')
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

        if (existing.read_at) {
            return NextResponse.json({
                success: true,
                alreadyRead: true,
                data: existing,
            });
        }

        const readAt = new Date().toISOString();
        const { data, error } = await supabase
            .from('notifications')
            .update({ read_at: readAt })
            .eq('id', id)
            .eq('user_id', authUser.userId)
            .select(
                'id, user_id, actor_id, type, title, body, payload, source_key, read_at, acted_at, created_at, updated_at',
            )
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            alreadyRead: false,
            data,
        });
    } catch (error) {
        console.error('Notification read error:', error);
        return NextResponse.json(
            { error: 'Failed to mark notification as read' },
            { status: 500 },
        );
    }
}
