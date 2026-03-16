import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/server/auth';
import { supabase } from '@/lib/supabase';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function sanitizeSegment(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function uploadToCloudinary(file: File, roomId: string, senderId: string) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Cloudinary environment variables are missing');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const safeRoomId = sanitizeSegment(roomId);
    const safeSenderId = sanitizeSegment(senderId);
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    const folder = `syncverse/chat/${safeRoomId}`;
    const publicId = `${safeSenderId}-${timestamp}-${randomSuffix}`;
    const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash('sha1').update(signatureBase).digest('hex');

    const cloudinaryForm = new FormData();
    cloudinaryForm.append('file', file);
    cloudinaryForm.append('api_key', apiKey);
    cloudinaryForm.append('timestamp', String(timestamp));
    cloudinaryForm.append('signature', signature);
    cloudinaryForm.append('folder', folder);
    cloudinaryForm.append('public_id', publicId);

    const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
            method: 'POST',
            body: cloudinaryForm,
        },
    );

    const uploadResult = await uploadResponse.json();
    if (!uploadResponse.ok) {
        const message =
            uploadResult?.error?.message || 'Failed to upload image to Cloudinary';
        throw new Error(message);
    }

    return {
        provider: 'CLOUDINARY' as const,
        resourceType: 'IMAGE' as const,
        publicId: String(uploadResult.public_id ?? ''),
        secureUrl: String(uploadResult.secure_url ?? ''),
        format: uploadResult.format ? String(uploadResult.format) : null,
        width:
            typeof uploadResult.width === 'number' ? uploadResult.width : null,
        height:
            typeof uploadResult.height === 'number' ? uploadResult.height : null,
        bytes:
            typeof uploadResult.bytes === 'number' ? uploadResult.bytes : null,
    };
}

export async function POST(request: NextRequest) {
    const authUser = getAuthUserFromRequest(request);
    if (!authUser?.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (authUser.authType === 'guest') {
        return NextResponse.json({ error: 'Guest not allowed' }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const roomId = String(formData.get('room_id') ?? '').trim();
        const senderId = String(formData.get('sender_id') ?? '').trim();
        const senderName = String(formData.get('sender_name') ?? '').trim();
        const content = String(formData.get('content') ?? '').trim();
        const filesFromForm = formData
            .getAll('files')
            .filter((item): item is File => item instanceof File);
        const singleFile = formData.get('file');
        const files =
            filesFromForm.length > 0
                ? filesFromForm
                : singleFile instanceof File
                  ? [singleFile]
                  : [];

        if (!roomId || !senderId || files.length === 0) {
            return NextResponse.json(
                { error: 'room_id, sender_id, files are required' },
                { status: 400 },
            );
        }
        if (senderId !== authUser.userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (files.length > 10) {
            return NextResponse.json(
                { error: 'You can upload up to 10 images at once' },
                { status: 400 },
            );
        }
        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                return NextResponse.json(
                    { error: 'Only image files are allowed' },
                    { status: 400 },
                );
            }
            if (file.size > MAX_IMAGE_BYTES) {
                return NextResponse.json(
                    { error: 'Image must be 10MB or smaller' },
                    { status: 400 },
                );
            }
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

        const { data: savedMessage, error: messageError } = await supabase
            .from('messages')
            .insert([
                {
                    room_id: roomId,
                    sender_id: senderId,
                    sender_name:
                        senderName ||
                        authUser.nickname ||
                        authUser.username ||
                        '사용자',
                    content:
                        content ||
                        (files.length > 1 ? `[사진 ${files.length}장]` : '[사진]'),
                },
            ])
            .select()
            .single();
        if (messageError) throw messageError;

        const attachmentRows = [];
        for (const file of files) {
            const uploaded = await uploadToCloudinary(file, roomId, senderId);
            if (!uploaded.publicId || !uploaded.secureUrl) {
                throw new Error('Invalid Cloudinary upload response');
            }
            attachmentRows.push({
                message_id: savedMessage.id,
                provider: uploaded.provider,
                resource_type: uploaded.resourceType,
                public_id: uploaded.publicId,
                secure_url: uploaded.secureUrl,
                format: uploaded.format,
                width: uploaded.width,
                height: uploaded.height,
                bytes: uploaded.bytes,
            });
        }

        const { data: savedAttachments, error: attachmentError } = await supabase
            .from('message_attachments')
            .insert(attachmentRows)
            .select(
                'id, message_id, provider, resource_type, public_id, secure_url, format, width, height, bytes, created_at',
            );
        if (attachmentError) throw attachmentError;

        return NextResponse.json(
            {
                data: {
                    ...savedMessage,
                    attachments: (savedAttachments ?? []).sort((a, b) =>
                        String(a.created_at ?? '').localeCompare(
                            String(b.created_at ?? ''),
                        ),
                    ),
                },
            },
            { status: 201 },
        );
    } catch (error: unknown) {
        const details =
            error instanceof Error ? error.message : JSON.stringify(error);
        console.error('Image message upload error:', error);
        return NextResponse.json(
            {
                error: 'Failed to upload image message',
                details,
            },
            { status: 500 },
        );
    }
}
