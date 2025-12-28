'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useAuthStore } from '@/app/stores/authStore';

export default function LoginPage() {
    const router = useRouter();
    const { user, initialize, loginAsGuest, isLoading } = useAuthStore();

    // 초기화 및 리다이렉트 체크
    useEffect(() => {
        initialize();

        if (user) {
            // 캐릭터 외형이 설정되어 있으면 메인으로, 없으면 캐릭터 설정으로
            const hasAppearance = !!(user.headColor && user.bodyColor);
            router.replace(hasAppearance ? '/' : '/character-setup');
        }
    }, [user, router, initialize]);

    const handleGuestLogin = () => {
        loginAsGuest(); // zustand store 사용
        router.push('/character-setup');
    };

    const handleGoogleLogin = async () => {
        try {
            // NextAuth는 별도 처리 (성공하면 callback에서 처리)
            await signIn('google', { callbackUrl: '/character-setup' });
        } catch (error) {
            console.error('구글 로그인 실패:', error);
        }
    };

    if (isLoading) {
        return (
            <div className='fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
                <div className='text-gray-600'>로딩 중...</div>
            </div>
        );
    }

    return (
        <div className='fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
            <div className='bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md'>
                <div className='text-center mb-8'>
                    <h1 className='text-3xl font-bold text-gray-800 mb-2'>
                        SyncVerse
                    </h1>
                    <p className='text-gray-600'>게임에 입장하세요</p>
                </div>

                <div className='space-y-4'>
                    {/* 구글 로그인 버튼 */}
                    <button
                        onClick={handleGoogleLogin}
                        className='w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 rounded-lg px-6 py-3 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors'
                    >
                        <svg
                            className='w-5 h-5'
                            viewBox='0 0 24 24'
                            fill='none'
                            xmlns='http://www.w3.org/2000/svg'
                        >
                            <path
                                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                                fill='#4285F4'
                            />
                            <path
                                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                                fill='#34A853'
                            />
                            <path
                                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                                fill='#FBBC05'
                            />
                            <path
                                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                                fill='#EA4335'
                            />
                        </svg>
                        구글로 로그인
                    </button>

                    {/* 구분선 */}
                    <div className='relative my-6'>
                        <div className='absolute inset-0 flex items-center'>
                            <div className='w-full border-t border-gray-300'></div>
                        </div>
                        <div className='relative flex justify-center text-sm'>
                            <span className='px-2 bg-white text-gray-500'>
                                또는
                            </span>
                        </div>
                    </div>

                    {/* 게스트 입장 버튼 */}
                    <button
                        onClick={handleGuestLogin}
                        className='w-full bg-indigo-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-indigo-700 transition-colors'
                    >
                        게스트로 입장
                    </button>
                </div>

                <p className='text-xs text-gray-500 text-center mt-6'>
                    게스트로 입장하면 임시 ID가 발급됩니다
                </p>
            </div>
        </div>
    );
}
