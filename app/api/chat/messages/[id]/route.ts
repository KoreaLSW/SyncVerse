import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/server/auth';
import { supabase } from '@/lib/supabase';

const DELETED_MESSAGE_TEXT = '삭제된 메세지입니다';

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

// DELETE /api/chat/messages/[id]
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
    const messageId = String(id ?? '').trim();
    if (!messageId) {
        return NextResponse.json(
            { error: 'Message id is required' },
            { status: 400 },
        );
    }

    try {
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .select('id, room_id, sender_id')
            .eq('id', messageId)
            .maybeSingle();
        if (messageError) throw messageError;
        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 });
        }

        const roomId = String(message.room_id ?? '');
        const senderId = String(message.sender_id ?? '');
        if (!roomId || !senderId) {
            return NextResponse.json(
                { error: 'Invalid message data' },
                { status: 400 },
            );
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

        if (senderId !== authUser.userId) {
            return NextResponse.json(
                { error: 'Only sender can delete this message' },
                { status: 403 },
            );
        }

        const { data: attachments, error: attachmentsError } = await supabase
            .from('message_attachments')
            .select('provider, public_id')
            .eq('message_id', messageId);
        if (attachmentsError) {
            const maybeError = attachmentsError as { code?: string };
            if (maybeError.code !== '42P01') {
                throw attachmentsError;
            }
        }

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

        const { error: attachmentsDeleteError } = await supabase
            .from('message_attachments')
            .delete()
            .eq('message_id', messageId);
        if (attachmentsDeleteError) {
            const maybeError = attachmentsDeleteError as { code?: string };
            if (maybeError.code !== '42P01') {
                throw attachmentsDeleteError;
            }
        }

        const { error: updateError } = await supabase
            .from('messages')
            .update({ content: DELETED_MESSAGE_TEXT })
            .eq('id', messageId);
        if (updateError) throw updateError;

        return NextResponse.json({ success: true, messageId, roomId });
    } catch (error) {
        console.error('Chat message delete error:', error);
        return NextResponse.json(
            { error: 'Failed to delete message' },
            { status: 500 },
        );
    }
}
