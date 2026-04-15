// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const NICKNAME_REGEX = /^[A-Za-z0-9가-힣]{1,12}$/;

// GET /api/users/[id] - 특정 사용자 조회
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ username: string }> } // 1. 타입을 Promise로 변경
) {
    const { username } = await params; // 2. await로 username 추출

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (error) {
        console.error('Supabase Error:', error); // 에러 로그를 찍어서 확인해 보세요
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
}

// PATCH /api/users/[id] - 사용자 업데이트
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    try {
        const { username } = await params;
        const body = await request.json();
        const updateData: any = {};

        // 닉네임 처리
        if (body.nickname !== undefined) {
            const nickname = String(body.nickname ?? '').trim();

            if (!NICKNAME_REGEX.test(nickname)) {
                return NextResponse.json(
                    {
                        error: 'Nickname must be 1-12 characters (Korean/English/number only)',
                    },
                    { status: 400 }
                );
            }

            const { data: duplicateUsers, error: duplicateError } = await supabase
                .from('users')
                .select('username')
                .neq('username', username)
                .ilike('nickname', nickname)
                .limit(1);

            if (duplicateError) throw duplicateError;

            if ((duplicateUsers ?? []).length > 0) {
                return NextResponse.json(
                    { error: 'Nickname already exists' },
                    { status: 409 }
                );
            }

            updateData.nickname = nickname;
        }

        // 위치 정보 처리
        if (body.position_x !== undefined)
            updateData.position_x = body.position_x;
        if (body.position_y !== undefined)
            updateData.position_y = body.position_y;

        // 🚀 avatar_config 처리 (색상 정보가 들어온 경우)
        if (body.headColor || body.bodyColor) {
            // 기존 유저의 avatar_config를 먼저 가져옵니다 (기존 데이터 유지 목적)
            const { data: user } = await supabase
                .from('users')
                .select('avatar_config')
                .eq('username', username)
                .single();

            const currentConfig = user?.avatar_config || {};

            updateData.avatar_config = {
                ...currentConfig,
                ...(body.headColor && { headColor: body.headColor }),
                ...(body.bodyColor && { bodyColor: body.bodyColor }),
            };
        }

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('username', username)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data });
    } catch (error: any) {
        console.error('PATCH Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// 기존 GET, PATCH 아래에 POST 추가
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ username: string }> }
) {
    // sendBeacon은 POST로 들어오므로 여기서 PATCH와 동일한 위치 업데이트 로직을 수행합니다.
    return PATCH(request, { params });
}

// DELETE /api/users/[id] - 사용자 삭제
export async function DELETE(
    request: NextRequest,
    { params }: { params: { username: string } }
) {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', params.username);

    if (error) {
        return NextResponse.json(
            { error: 'Failed to delete user' },
            { status: 500 }
        );
    }

    return NextResponse.json({ success: true });
}
