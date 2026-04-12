import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUserFromRequest } from '@/lib/server/auth';
import { createHash } from 'crypto';

function sanitizeSegment(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function destroyCloudinaryImage(publicId: string) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary environment variables are missing');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signatureBase = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signatureBase).digest('hex');

    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('signature', signature);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
            method: 'POST',
            body: formData,
        },
    );
    const result = await response.json();
    if (!response.ok) {
        const message =
            result?.error?.message || 'Failed to delete image from Cloudinary';
        throw new Error(message);
    }

    const deleteResult = String(result?.result ?? '').toLowerCase();
    if (deleteResult !== 'ok' && deleteResult !== 'not found') {
        throw new Error(`Unexpected Cloudinary delete result: ${deleteResult}`);
    }
}

async function deleteCloudinaryFolder(folderPath: string) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary environment variables are missing');
    }

    const encodedFolder = encodeURIComponent(folderPath);
    const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/folders/${encodedFolder}`,
        {
            method: 'DELETE',
            headers: {
                Authorization: `Basic ${basicAuth}`,
            },
        },
    );

    if (response.status === 404) {
        // 이미 삭제되었거나 존재하지 않으면 성공으로 간주
        return;
    }

    const result = await response.json();
    if (!response.ok) {
        const message = result?.error?.message || 'Failed to delete Cloudinary folder';
        throw new Error(message);
    }
}

// DELETE /api/chat/rooms/[id]
// 요청에 맞춰 방 + 메시지(연쇄 삭제)까지 삭제
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> },
) {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.authType === 'guest') {
        return NextResponse.json({ error: 'Guest not allowed' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: 'Room id is required' }, { status: 400 });
    }

    try {
        const { data: room, error: roomError } = await supabase
            .from('chat_rooms')
            .select('id, type, created_by')
            .eq('id', id)
            .maybeSingle();
        if (roomError) throw roomError;
        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }
        if (room.type !== 'DM' && room.type !== 'GROUP') {
            return NextResponse.json(
                { error: 'Only DM/GROUP rooms can be deleted here' },
                { status: 403 },
            );
        }

        if (room.type === 'GROUP') {
            const ownerId = String(room.created_by ?? '');
            if (!ownerId || ownerId !== authUser.userId) {
                return NextResponse.json(
                    { error: 'Only group owner can delete this room' },
                    { status: 403 },
                );
            }
        } else {
            const { data: participant, error: participantError } = await supabase
                .from('chat_participants')
                .select('room_id')
                .eq('room_id', id)
                .eq('user_id', authUser.userId)
                .maybeSingle();
            if (participantError) throw participantError;
            if (!participant) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        // 방 삭제 전 첨부 이미지 public_id 수집 후 Cloudinary 리소스 삭제
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('id')
            .eq('room_id', id);
        if (messagesError) throw messagesError;

        const messageIds = (messages ?? [])
            .map((row) => String(row.id ?? ''))
            .filter(Boolean);

        if (messageIds.length > 0) {
            const { data: attachments, error: attachmentsError } = await supabase
                .from('message_attachments')
                .select('public_id, provider')
                .in('message_id', messageIds);
            if (attachmentsError) throw attachmentsError;

            const publicIds = Array.from(
                new Set(
                    (attachments ?? [])
                        .filter(
                            (row) =>
                                String(row.provider ?? '').toUpperCase() === 'CLOUDINARY',
                        )
                        .map((row) => String(row.public_id ?? '').trim())
                        .filter(Boolean),
                ),
            );

            for (const publicId of publicIds) {
                await destroyCloudinaryImage(publicId);
            }
        }

        const folderPath = `syncverse/DM/${sanitizeSegment(id)}`;
        await deleteCloudinaryFolder(folderPath);

        // messages / chat_participants는 FK cascade로 함께 삭제됨
        const { error: deleteError } = await supabase
            .from('chat_rooms')
            .delete()
            .eq('id', id);
        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true, roomId: id });
    } catch (error) {
        console.error('Chat room delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete chat room' },
            { status: 500 },
        );
    }
}
