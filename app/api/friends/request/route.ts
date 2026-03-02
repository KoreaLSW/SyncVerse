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

            let accepterNickname =
                authUser.nickname ?? authUser.username ?? '사용자';
            if (!authUser.nickname) {
                const { data: accepterUser } = await supabase
                    .from('users')
                    .select('nickname, username')
                    .eq('id', authUser.userId)
                    .maybeSingle();
                accepterNickname =
                    accepterUser?.nickname ??
                    accepterUser?.username ??
                    accepterNickname;
            }

            // 자동 수락 시에도 기존 요청자에게 수락 알림 전달
            try {
                const { error: notificationError } = await supabase
                    .from('notifications')
                    .insert({
                        user_id: relation.sender_id,
                        actor_id: authUser.userId,
                        type: 'SYSTEM',
                        title: '친구 요청 수락',
                        body: `${accepterNickname}님이 친구요청을 수락했습니다.`,
                        payload: {
                            friendshipId: relation.id,
                            accepterId: authUser.userId,
                            accepterNickname,
                            senderId: relation.sender_id,
                        },
                        source_key: `FRIEND_ACCEPTED:${relation.id}`,
                    });
                if (notificationError) {
                    console.error(
                        'Notification insert error:',
                        notificationError,
                    );
                }
            } catch (notificationError) {
                console.error('Notification insert error:', notificationError);
            }

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

        let senderNickname = authUser.nickname ?? authUser.username ?? '사용자';
        if (!authUser.nickname) {
            const { data: senderUser } = await supabase
                .from('users')
                .select('nickname, username')
                .eq('id', authUser.userId)
                .maybeSingle();
            senderNickname =
                senderUser?.nickname ??
                senderUser?.username ??
                senderNickname;
        }

        // 알림 저장 실패가 친구 요청 자체를 막지 않도록 분리 처리
        try {
            const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                    user_id: receiverId,
                    actor_id: authUser.userId,
                    type: 'FRIEND_REQUEST',
                    title: '새 친구 요청',
                    body: `${senderNickname}님이 친구 요청을 보냈습니다.`,
                    payload: {
                        friendshipId: data.id,
                        senderId: authUser.userId,
                        senderNickname,
                        receiverId,
                    },
                    source_key: `FRIENDSHIP:${data.id}`,
                });
            if (notificationError) {
                console.error('Notification insert error:', notificationError);
            }
        } catch (notificationError) {
            console.error('Notification insert error:', notificationError);
        }

        return NextResponse.json({ status: 'PENDING_SENT', data });
    } catch (error) {
        console.error('Friend request error:', error);
        return NextResponse.json(
            { error: 'Failed to request friend' },
            { status: 500 }
        );
    }
}
