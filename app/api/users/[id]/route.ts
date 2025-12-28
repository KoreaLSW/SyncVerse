// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

// GET /api/users/[id] - 특정 사용자 조회
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', params.id)
        .single();

    if (error) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
}

// PATCH /api/users/[id] - 사용자 업데이트
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const body = await request.json();

    const { data, error } = await supabase
        .from('users')
        .update(body)
        .eq('id', params.id)
        .select()
        .single();

    if (error) {
        return NextResponse.json(
            { error: 'Failed to update user' },
            { status: 500 }
        );
    }

    return NextResponse.json({ data });
}

// DELETE /api/users/[id] - 사용자 삭제
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { error } = await supabase.from('users').delete().eq('id', params.id);

    if (error) {
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true });
}
