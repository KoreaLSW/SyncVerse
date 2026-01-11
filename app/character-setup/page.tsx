'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWRMutation from 'swr/mutation';
import type { CharacterAppearance } from '@/lib/types';
import {
    getCharacterImagePath,
    getSpriteBackgroundPosition,
} from '@/lib/playerUtils';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '../../lib/api';
import { updateUserAppearance } from '../../lib/userUtils';

const COLORS: CharacterAppearance['headColor'][] = [
    'amber',
    'black',
    'bronze',
    'green',
    'light',
    'white',
];

export default function CharacterSetupPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEditMode = searchParams.get('mode') === 'edit'; // 수정 모드인지 확인

    const { user, login, updateUser, initialize } = useAuthStore();

    const [headColor, setHeadColor] = useState<
        CharacterAppearance['headColor']
    >(user?.headColor ?? 'amber');
    const [bodyColor, setBodyColor] = useState<
        CharacterAppearance['bodyColor']
    >(user?.bodyColor ?? 'amber');
    // 초기화 및 구글 로그인 처리
    useEffect(() => {
        initialize();

        // 1. 구글 세션 확인 및 스토어 로그인
        if (!user && session?.user) {
            const googleId = (session.user as any).id;
            const username = (session.user as any).username;

            if (googleId && username) {
                // 🚀 DB에서 사용자 정보를 가져와서 외형 설정이 있는지 확인
                apiClient
                    .get(`/api/users/${username}`)
                    .then((res) => {
                        const dbUser = res.data.data;
                        const avatarConfig = dbUser?.avatar_config || {};

                        // 스토어 정보 업데이트 (DB 값 우선)
                        login({
                            userId: String(googleId),
                            authType: 'google',
                            email: session.user?.email ?? undefined,
                            name: session.user?.name ?? undefined,
                            username: username,
                            headColor: avatarConfig.headColor,
                            bodyColor: avatarConfig.bodyColor,
                        });

                        console.log('dbUser!!', dbUser);
                        console.log('user!!', user);
                        console.log('session!!', session);
                        console.log('username!!', username);
                        console.log('avatarConfig!!', avatarConfig);
                        // 🚀 수정 모드가 아니고, 이미 외형 설정이 되어 있다면 즉시 메인으로 이동
                        if (
                            !isEditMode &&
                            avatarConfig.headColor &&
                            avatarConfig.bodyColor
                        ) {
                            router.replace('/');
                        }
                    })
                    .catch((err) => {
                        console.error('사용자 정보 로드 실패:', err);
                        // 에러 시 기본 정보로 로그인 처리
                        login({
                            userId: String(googleId),
                            authType: 'google',
                            username: username,
                        });
                    });
            }
        }

        // 2. 인증되지 않았으면 로그인 페이지로
        if (!user && !session?.user) {
            router.replace('/login');
        }
    }, [user, session, router, login, initialize, isEditMode]);

    // user가 변경되면 색상 초기화
    useEffect(() => {
        if (user) {
            if (user.headColor) setHeadColor(user.headColor);
            if (user.bodyColor) setBodyColor(user.bodyColor);
        }
    }, [user]);

    const { head, body } = getCharacterImagePath(headColor, bodyColor);
    const bgPos = getSpriteBackgroundPosition('down', 0);

    // 🚀 SWR Mutation을 사용하여 데이터 저장 관리
    const { trigger, isMutating } = useSWRMutation(
        user?.username ? `/api/users/${user.username}` : null,
        async (_url, { arg }: { arg: Partial<CharacterAppearance> }) => {
            return await updateUserAppearance(user!.username!, arg);
        },
        {
            onSuccess: () => {
                // Zustand Store 업데이트 (로컬 상태 반영)
                updateUser({
                    headColor,
                    bodyColor,
                });
                // 메인 화면으로 이동
                router.push('/');
            },
            onError: (error) => {
                console.error('캐릭터 설정 저장 중 오류 발생:', error);
                alert('설정을 저장하는 데 실패했습니다. 다시 시도해 주세요.');
            },
        }
    );

    const onSave = () => {
        if (!user || !user.username) {
            router.replace('/login');
            return;
        }

        // Mutation 실행
        trigger({ headColor, bodyColor });
    };

    if (!user) {
        return (
            <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
                <div className='text-gray-600'>로딩 중...</div>
            </div>
        );
    }

    return (
        <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6'>
            <div className='bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl'>
                <div className='flex items-start justify-between gap-6'>
                    <div>
                        <h1 className='text-2xl font-bold text-gray-800'>
                            캐릭터 선택
                        </h1>
                        <p className='text-gray-600 mt-1'>
                            머리/몸통 색을 골라 조합해요.
                        </p>
                    </div>

                    {/* 미리보기 */}
                    <div className='flex flex-col items-center gap-2'>
                        <div
                            className='relative'
                            style={{ width: 64, height: 64 }}
                        >
                            <div
                                className='absolute inset-0'
                                style={{
                                    backgroundImage: `url(${body})`,
                                    backgroundPosition: bgPos,
                                    backgroundSize: 'auto',
                                    imageRendering: 'pixelated',
                                }}
                            />
                            <div
                                className='absolute inset-0'
                                style={{
                                    backgroundImage: `url(${head})`,
                                    backgroundPosition: bgPos,
                                    backgroundSize: 'auto',
                                    imageRendering: 'pixelated',
                                }}
                            />
                        </div>
                        <div className='text-xs text-gray-500'>미리보기</div>
                    </div>
                </div>

                <div className='mt-8 grid grid-cols-1 md:grid-cols-2 gap-8'>
                    {/* Head 선택 */}
                    <div>
                        <div className='font-semibold text-gray-800 mb-3'>
                            머리(head)
                        </div>
                        <div className='grid grid-cols-6 gap-2'>
                            {COLORS.map((c) => {
                                const img = `/character/head/human_male/${c}.png`;
                                const selected = headColor === c;
                                return (
                                    <button
                                        key={c}
                                        onClick={() => setHeadColor(c)}
                                        className={`rounded-lg border flex items-center justify-center w-16 h-16 ${
                                            selected
                                                ? 'border-indigo-600 ring-2 ring-indigo-200'
                                                : 'border-gray-200'
                                        }`}
                                        title={c}
                                    >
                                        <div
                                            style={{
                                                width: 64,
                                                height: 64,
                                                backgroundImage: `url(${img})`,
                                                backgroundPosition: bgPos,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundSize: 'auto',
                                                imageRendering: 'pixelated',
                                                transform: 'scale(0.7)',
                                                transformOrigin: 'center',
                                            }}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Body 선택 */}
                    <div>
                        <div className='font-semibold text-gray-800 mb-3'>
                            몸통(body)
                        </div>
                        <div className='grid grid-cols-6 gap-2'>
                            {COLORS.map((c) => {
                                const img = `/character/body/body_color/${c}.png`;
                                const selected = bodyColor === c;
                                return (
                                    <button
                                        key={c}
                                        onClick={() => setBodyColor(c)}
                                        className={`rounded-lg border flex items-center justify-center w-16 h-16 ${
                                            selected
                                                ? 'border-indigo-600 ring-2 ring-indigo-200'
                                                : 'border-gray-200'
                                        }`}
                                        title={c}
                                    >
                                        <div
                                            style={{
                                                width: 64,
                                                height: 64,
                                                backgroundImage: `url(${img})`,
                                                backgroundPosition: bgPos,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundSize: 'auto',
                                                imageRendering: 'pixelated',
                                                transform: 'scale(0.7)',
                                                transformOrigin: 'center',
                                            }}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className='mt-8 flex justify-end gap-3'>
                    <button
                        onClick={onSave}
                        disabled={isMutating}
                        className='bg-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed'
                    >
                        {isMutating ? '저장 중...' : '저장하고 입장'}
                    </button>
                </div>
            </div>
        </div>
    );
}
