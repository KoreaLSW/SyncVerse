// app/api/chat/messages/route.ts
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/server/auth';

type AttachmentRow = {
    id: string;
    message_id: string;
    provider: string;
    resource_type: string;
    public_id: string;
    secure_url: string;
    format: string | null;
    width: number | null;
    height: number | null;
    bytes: number | null;
    created_at: string;
};

async function fetchAttachmentsByMessageIds(messageIds: string[]) {
    if (!messageIds.length) {
        return {} as Record<string, AttachmentRow[]>;
    }

    const { data, error } = await supabase
        .from('message_attachments')
        .select(
            'id, message_id, provider, resource_type, public_id, secure_url, format, width, height, bytes, created_at',
        )
        .in('message_id', messageIds)
        .order('created_at', { ascending: true });

    if (error) {
        // 첨부 테이블 미생성 환경에서도 텍스트 채팅은 정상 동작하도록 안전 처리
        const maybeError = error as { code?: string };
        if (maybeError.code === '42P01') {
            return {} as Record<string, AttachmentRow[]>;
        }
        throw error;
    }

    return (data ?? []).reduce(
        (acc, row) => {
            const key = String(row.message_id ?? '');
            if (!key) return acc;
            if (!acc[key]) acc[key] = [];
            acc[key].push(row);
            return acc;
        },
        {} as Record<string, AttachmentRow[]>,
    );
}

// 채팅 내역 가져오기
export async function GET(request: NextRequest) {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.authType === 'guest') {
        return NextResponse.json({ error: 'Guest not allowed' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const limitRaw = Number(searchParams.get('limit') || '20');
    const offsetRaw = Number(searchParams.get('offset') || '0');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 20;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    if (!roomId) {
        return NextResponse.json(
            { error: 'Room ID is required' },
            { status: 400 }
        );
    }

    try {
        const { data: participant, error: participantError } = await supabase
            .from('chat_participants')
            .select('room_id')
            .eq('room_id', roomId)
            .eq('user_id', authUser.userId)
            .maybeSingle();
        if (participantError) throw participantError;
        if (!participant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: peerParticipants, error: peerParticipantsError } = await supabase
            .from('chat_participants')
            .select('user_id, last_read_at')
            .eq('room_id', roomId)
            .neq('user_id', authUser.userId);
        if (peerParticipantsError) throw peerParticipantsError;

        const peerReadCutoffMs = (peerParticipants ?? []).reduce((latest, row) => {
            const readAtMs = row.last_read_at
                ? new Date(String(row.last_read_at)).getTime()
                : 0;
            if (Number.isNaN(readAtMs)) return latest;
            return Math.max(latest, readAtMs);
        }, 0);

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false }) // 최신 메시지가 먼저 오게 정렬
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // 클라이언트에서 보여줄 때는 과거->현재 순서로 보여줘야 하므로 뒤집기
        const normalized = (data ?? []).reverse().map((message) => {
            const createdAtMs = message.created_at
                ? new Date(String(message.created_at)).getTime()
                : 0;
            const isMine = String(message.sender_id) === authUser.userId;
            return {
                ...message,
                is_read_by_peer:
                    isMine &&
                    peerReadCutoffMs > 0 &&
                    !Number.isNaN(createdAtMs) &&
                    createdAtMs <= peerReadCutoffMs,
            };
        });

        const attachmentsByMessageId = await fetchAttachmentsByMessageIds(
            normalized.map((message) => String(message.id ?? '')).filter(Boolean),
        );

        const withAttachments = normalized.map((message) => ({
            ...message,
            attachments: attachmentsByMessageId[String(message.id ?? '')] ?? [],
        }));

        return NextResponse.json({ data: withAttachments });
    } catch (error) {
        console.error('Fetch messages error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}

// 메시지 저장하기
export async function POST(request: NextRequest) {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.authType === 'guest') {
        return NextResponse.json({ error: 'Guest not allowed' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const roomId = String(body?.room_id ?? '');
        const senderId = String(body?.sender_id ?? '');
        const senderName = String(body?.sender_name ?? '').trim();
        const content = String(body?.content ?? '').trim();

        if (!roomId || !senderId || !content) {
            return NextResponse.json(
                { error: 'room_id, sender_id, content are required' },
                { status: 400 }
            );
        }
        if (senderId !== authUser.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data: participant, error: participantError } = await supabase
            .from('chat_participants')
            .select('room_id')
            .eq('room_id', roomId)
            .eq('user_id', authUser.userId)
            .maybeSingle();
        if (participantError) throw participantError;
        if (!participant) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { data, error } = await supabase
            .from('messages')
            .insert([
                {
                    room_id: roomId,
                    sender_id: senderId,
                    sender_name: senderName || authUser.nickname || authUser.username || '사용자',
                    content,
                },
            ])
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ data }, { status: 201 });
    } catch (error: unknown) {
        const details =
            error instanceof Error ? error.message : JSON.stringify(error);
        console.error('Save message error:', error);
        return NextResponse.json(
            {
                error: 'Failed to save message',
                details,
            },
            { status: 500 }
        );
    }
}
