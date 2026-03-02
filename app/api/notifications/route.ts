import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

// GET /api/notifications?limit=30&cursor=...&unreadOnly=true&type=FRIEND_REQUEST
// 알림 목록 조회
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get('limit') ?? 30);
    const limit = Number.isFinite(limitParam)
        ? Math.min(Math.max(Math.floor(limitParam), 1), 100)
        : 30;
    const cursor = searchParams.get('cursor');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const type = searchParams.get('type');

    try {
        let query = supabase
            .from('notifications')
            .select(
                'id, user_id, actor_id, type, title, body, payload, source_key, read_at, acted_at, created_at, updated_at',
            )
            .eq('user_id', authUser.userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (cursor) {
            query = query.lt('created_at', cursor);
        }
        if (unreadOnly) {
            query = query.is('read_at', null);
        }
        if (type) {
            query = query.eq('type', type);
        }

        const { data, error } = await query;
        if (error) throw error;

        const nextCursor =
            data && data.length === limit
                ? (data[data.length - 1].created_at as string | null)
                : null;

        return NextResponse.json({
            data: data ?? [],
            pageInfo: {
                limit,
                nextCursor,
            },
        });
    } catch (error) {
        console.error('Notifications list error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch notifications' },
            { status: 500 },
        );
    }
}

// DELETE /api/notifications?readOnly=true
// readOnly=true면 읽은 알림만 일괄 삭제한다.
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const readOnly = searchParams.get('readOnly') === 'true';
    if (!readOnly) {
        return NextResponse.json(
            { error: 'readOnly=true query is required' },
            { status: 400 },
        );
    }

    try {
        const { data, error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', authUser.userId)
            .not('read_at', 'is', null)
            .select('id');

        if (error) throw error;

        return NextResponse.json({
            success: true,
            deletedCount: data?.length ?? 0,
        });
    } catch (error) {
        console.error('Notifications clear-read error:', error);
        return NextResponse.json(
            { error: 'Failed to clear read notifications' },
            { status: 500 },
        );
    }
}
