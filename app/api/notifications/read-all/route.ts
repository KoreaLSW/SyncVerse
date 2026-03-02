import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// POST /api/notifications/read-all
// 모든 알림 읽음 처리
export async function POST(request: NextRequest) {
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

    try {
        const readAt = new Date().toISOString();
        const { data, error } = await supabase
            .from('notifications')
            .update({ read_at: readAt })
            .eq('user_id', authUser.userId)
            .is('read_at', null)
            .select('id');

        if (error) throw error;

        return NextResponse.json({
            success: true,
            readCount: data?.length ?? 0,
            readAt,
        });
    } catch (error) {
        console.error('Notifications read-all error:', error);
        return NextResponse.json(
            { error: 'Failed to mark all notifications as read' },
            { status: 500 },
        );
    }
}
