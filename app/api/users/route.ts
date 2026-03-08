// app/api/users/route.ts
import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/users - 사용자 목록
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim() ?? '';
        const limitRaw = Number(searchParams.get('limit') ?? 10);
        const offsetRaw = Number(searchParams.get('offset') ?? 0);
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(limitRaw, 1), 50)
            : 10;
        const offset = Number.isFinite(offsetRaw)
            ? Math.max(offsetRaw, 0)
            : 0;

        if (query) {
            const { data, error } = await supabase
                .from('users')
                .select('id, username, nickname')
                .or(`nickname.ilike.%${query}%,username.ilike.%${query}%`)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit);

            if (error) throw error;

            const users = data ?? [];
            const hasMore = users.length > limit;
            const pagedUsers = users.slice(0, limit);

            return NextResponse.json({
                data: pagedUsers,
                hasMore,
                nextOffset: offset + pagedUsers.length,
            });
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({
            data,
            hasMore: false,
            nextOffset: data?.length ?? 0,
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        );
    }
}

// POST /api/users - 사용자 생성
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const { data, error } = await supabase
            .from('users')
            .insert([body])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create user' },
            { status: 500 }
        );
    }
}
