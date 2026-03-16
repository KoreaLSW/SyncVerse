import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';

type ChatRequestStatus =
    | 'PENDING'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'CANCELED'
    | 'EXPIRED';

// GET /api/chat-requests?scope=all|sent|received&limit=20&offset=0
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

    try {
        const { searchParams } = new URL(request.url);
        const scopeParam = searchParams.get('scope');
        const scope =
            scopeParam === 'sent' || scopeParam === 'received'
                ? scopeParam
                : 'all';
        const limitRaw = Number(searchParams.get('limit') ?? 20);
        const offsetRaw = Number(searchParams.get('offset') ?? 0);
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(limitRaw, 1), 50)
            : 20;
        const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

        let query = supabase
            .from('chat_requests')
            .select(
                'id, sender_id, receiver_id, status, created_at, resolved_room_id',
            )
            .eq('request_type', 'DM_INVITE');

        if (scope === 'sent') {
            query = query.eq('sender_id', authUser.userId);
        } else if (scope === 'received') {
            query = query.eq('receiver_id', authUser.userId);
        } else {
            query = query.or(
                `sender_id.eq.${authUser.userId},receiver_id.eq.${authUser.userId}`,
            );
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit);

        if (error) throw error;

        const rows = data ?? [];
        const targetIds = Array.from(
            new Set(
                rows.map((row) =>
                    row.sender_id === authUser.userId
                        ? String(row.receiver_id)
                        : String(row.sender_id),
                ),
            ),
        );

        let usersMap = new Map<string, { nickname: string; username: string }>();
        if (targetIds.length > 0) {
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id, nickname, username')
                .in('id', targetIds);
            if (usersError) throw usersError;
            usersMap = new Map(
                (users ?? []).map((user) => [
                    user.id as string,
                    {
                        nickname: String(user.nickname ?? ''),
                        username: String(user.username ?? ''),
                    },
                ]),
            );
        }

        const requests = rows.map((row) => {
            const direction =
                row.sender_id === authUser.userId ? 'sent' : 'received';
            const targetId =
                direction === 'sent'
                    ? String(row.receiver_id)
                    : String(row.sender_id);
            const targetUser = usersMap.get(targetId);
            return {
                id: String(row.id),
                targetId,
                targetNickname: targetUser?.nickname ?? '',
                targetUsername: targetUser?.username ?? '',
                status: row.status as ChatRequestStatus,
                createdAt: String(row.created_at),
                resolvedRoomId: row.resolved_room_id
                    ? String(row.resolved_room_id)
                    : null,
                direction,
                canRespond:
                    direction === 'received' &&
                    (row.status as ChatRequestStatus) === 'PENDING',
            };
        });

        const hasMore = requests.length > limit;
        const pagedRequests = requests.slice(0, limit);

        return NextResponse.json({
            data: pagedRequests,
            hasMore,
            nextOffset: offset + pagedRequests.length,
        });
    } catch (error) {
        console.error('Chat request list error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chat requests' },
            { status: 500 },
        );
    }
}

// POST /api/chat-requests
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
        const body = await request.json();
        const receiverId = String(body?.receiverId ?? '');
        const requestMessage = String(body?.requestMessage ?? '').trim();

        if (!receiverId) {
            return NextResponse.json(
                { error: 'receiverId is required' },
                { status: 400 },
            );
        }
        if (receiverId === authUser.userId) {
            return NextResponse.json(
                { error: 'Cannot request yourself' },
                { status: 400 },
            );
        }

        const { data: existingPending, error: existingPendingError } = await supabase
            .from('chat_requests')
            .select('id')
            .eq('request_type', 'DM_INVITE')
            .eq('status', 'PENDING')
            .or(
                `and(sender_id.eq.${authUser.userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${authUser.userId})`,
            )
            .limit(1);
        if (existingPendingError) throw existingPendingError;
        if ((existingPending ?? []).length > 0) {
            return NextResponse.json(
                { error: 'Already pending request exists' },
                { status: 409 },
            );
        }

        const { data: created, error: createError } = await supabase
            .from('chat_requests')
            .insert({
                sender_id: authUser.userId,
                receiver_id: receiverId,
                request_type: 'DM_INVITE',
                status: 'PENDING',
                request_message: requestMessage || null,
            })
            .select('id, sender_id, receiver_id, status, created_at')
            .single();

        if (createError) throw createError;

        const { data: senderUser } = await supabase
            .from('users')
            .select('nickname, username')
            .eq('id', authUser.userId)
            .maybeSingle();
        const senderNickname =
            senderUser?.nickname ?? senderUser?.username ?? '사용자';

        // 알림 저장 실패가 요청 생성을 막지 않도록 별도 처리
        try {
            const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                    user_id: receiverId,
                    actor_id: authUser.userId,
                    type: 'MESSAGE_REQUEST',
                    title: '새 1:1 대화 요청',
                    body: `${senderNickname}님이 1:1 대화를 요청했습니다.`,
                    payload: {
                        chatRequestId: created.id,
                        senderId: authUser.userId,
                        senderNickname,
                        receiverId,
                    },
                    source_key: `CHAT_REQUEST:${created.id}`,
                });
            if (notificationError) {
                console.error('Notification insert error:', notificationError);
            }
        } catch (notificationError) {
            console.error('Notification insert error:', notificationError);
        }

        return NextResponse.json({ data: created }, { status: 201 });
    } catch (error) {
        console.error('Chat request create error:', error);
        return NextResponse.json(
            { error: 'Failed to create chat request' },
            { status: 500 },
        );
    }
}
