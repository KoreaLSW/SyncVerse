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

        let accepterNickname = authUser.nickname ?? authUser.username ?? '사용자';
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

        // 알림 저장 실패가 수락 자체를 막지 않도록 분리 처리
        try {
            const { error: notificationError } = await supabase
                .from('notifications')
                .insert({
                    user_id: senderId,
                    actor_id: authUser.userId,
                    type: 'SYSTEM',
                    title: '친구 요청 수락',
                    body: `${accepterNickname}님이 친구요청을 수락했습니다.`,
                    payload: {
                        friendshipId: data.id,
                        accepterId: authUser.userId,
                        accepterNickname,
                        senderId,
                    },
                    source_key: `FRIEND_ACCEPTED:${data.id}`,
                });
            if (notificationError) {
                console.error('Notification insert error:', notificationError);
            }
        } catch (notificationError) {
            console.error('Notification insert error:', notificationError);
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
