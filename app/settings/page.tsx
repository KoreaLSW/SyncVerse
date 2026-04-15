'use client';

import { useRouter } from 'next/navigation';
import { NicknameSettingSection } from '@/components/setting/nickname/NicknameSettingSection';
import { useAuthStore } from '@/stores/authStore';
import { useCurrentNickname } from '@/hooks/settings/useCurrentNickname';

const notificationOptions = [
    { id: 'friendAccept', label: '친구 수락 알림' },
    { id: 'friendRemove', label: '친구 해제 알림' },
    { id: 'groupInvite', label: '그룹 초대 알림' },
    { id: 'messageMention', label: '메시지 멘션 알림' },
];

const friendListMock = [
    { id: 'f1', nickname: '민수', status: '온라인' },
    { id: 'f2', nickname: '지은', status: '자리 비움' },
];

const requestListMock = [
    { id: 'r1', nickname: '하린', status: '요청 대기중' },
    { id: 'r2', nickname: '도윤', status: '요청 대기중' },
];

const blockListMock = [
    { id: 'b1', nickname: 'spam_user1', status: '차단됨' },
    { id: 'b2', nickname: 'annoying_user', status: '차단됨' },
];

export default function SettingsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { currentNickname, refresh } = useCurrentNickname({
        username: user?.username,
        fallbackNickname: user?.nickname,
        fallbackUsername: user?.username,
    });

    return (
        <main className='min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6'>
            <div className='mx-auto w-full max-w-5xl'>
                <button
                    type='button'
                    onClick={() => router.push('/')}
                    className='mb-4 rounded-lg border border-white/20 bg-black/60 px-3 py-2 text-sm text-white transition hover:bg-black/80'
                >
                    ← 메인으로
                </button>

                <section className='mb-5 rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md'>
                    <h1 className='text-2xl font-bold'>설정</h1>
                    <p className='mt-2 text-sm text-white/70'>
                        우선 UI만 구성된 화면입니다. 이후 API 연동과 검증 로직을
                        순차적으로 연결하면 됩니다.
                    </p>
                </section>

                <div className='grid gap-5'>
                    <section className='rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md'>
                        <h2 className='text-lg font-semibold'>프로필 설정</h2>
                        <div className='mt-4 grid gap-5 lg:grid-cols-2'>
                            <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                <p className='text-sm font-medium text-white/90'>
                                    프로필 사진
                                </p>
                                <div className='mt-4 flex items-center gap-4'>
                                    <div className='flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-slate-900/70 text-xs text-white/60'>
                                        96 x 96
                                    </div>
                                    <div className='space-y-2'>
                                        <button
                                            type='button'
                                            className='w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20'
                                        >
                                            사진 추가/수정
                                        </button>
                                        <button
                                            type='button'
                                            className='w-full rounded-md border border-white/20 bg-black/40 px-3 py-2 text-sm transition hover:bg-black/60'
                                        >
                                            기본 프로필로 설정
                                        </button>
                                    </div>
                                </div>
                                <ul className='mt-4 space-y-1 text-xs text-white/60'>
                                    <li>
                                        업로드 원본 권장: 512x512 (최소 256x256)
                                    </li>
                                    <li>노출 크기: 96x96 / 최대 용량: 500KB</li>
                                    <li>선택 즉시 미리보기 영역 반영</li>
                                </ul>
                            </div>

                            <NicknameSettingSection
                                currentNickname={currentNickname}
                                username={user?.username}
                                onNicknameChanged={() => {
                                    refresh();
                                }}
                            />
                        </div>

                        <div className='mt-5 rounded-lg border border-white/10 bg-white/5 p-4'>
                            <p className='text-sm font-medium text-white/90'>
                                캐릭터 수정
                            </p>
                            <p className='mt-2 text-xs text-white/60'>
                                현재 장착한 캐릭터의 외형을 변경하는 영역입니다.
                            </p>
                            <button
                                type='button'
                                className='mt-3 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20'
                            >
                                캐릭터 수정 화면 열기
                            </button>
                        </div>
                    </section>

                    <section className='rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md'>
                        <h2 className='text-lg font-semibold'>알람</h2>
                        <p className='mt-1 text-xs text-white/60'>
                            알림 유형별 on/off UI
                        </p>
                        <div className='mt-4 grid gap-3'>
                            {notificationOptions.map((option) => (
                                <label
                                    key={option.id}
                                    className='flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2'
                                >
                                    <span className='text-sm text-white/90'>
                                        {option.label}
                                    </span>
                                    <input
                                        type='checkbox'
                                        defaultChecked
                                        className='h-4 w-4 accent-cyan-400'
                                    />
                                </label>
                            ))}
                        </div>
                    </section>

                    <section className='rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md'>
                        <h2 className='text-lg font-semibold'>친구 관리</h2>
                        <div className='mt-4 grid gap-4 lg:grid-cols-3'>
                            <article className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                <p className='text-sm font-medium text-white/90'>
                                    친구리스트
                                </p>
                                <input
                                    type='text'
                                    placeholder='유저 검색'
                                    className='mt-3 w-full rounded-md border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none placeholder:text-white/40'
                                />
                                <ul className='mt-3 space-y-2'>
                                    {friendListMock.map((user) => (
                                        <li
                                            key={user.id}
                                            className='rounded-md border border-white/10 bg-black/30 p-2'
                                        >
                                            <div className='flex items-center justify-between gap-2'>
                                                <div className='flex items-center gap-2'>
                                                    <div className='h-8 w-8 rounded-full border border-white/20 bg-slate-800' />
                                                    <div>
                                                        <p className='text-sm'>
                                                            {user.nickname}
                                                        </p>
                                                        <p className='text-[11px] text-white/60'>
                                                            {user.status}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type='button'
                                                    className='rounded border border-rose-400/40 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/20'
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </article>

                            <article className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                <p className='text-sm font-medium text-white/90'>
                                    요청 리스트
                                </p>
                                <input
                                    type='text'
                                    placeholder='유저 검색'
                                    className='mt-3 w-full rounded-md border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none placeholder:text-white/40'
                                />
                                <ul className='mt-3 space-y-2'>
                                    {requestListMock.map((user) => (
                                        <li
                                            key={user.id}
                                            className='rounded-md border border-white/10 bg-black/30 p-2'
                                        >
                                            <div className='flex items-center gap-2'>
                                                <div className='h-8 w-8 rounded-full border border-white/20 bg-slate-800' />
                                                <div>
                                                    <p className='text-sm'>
                                                        {user.nickname}
                                                    </p>
                                                    <p className='text-[11px] text-white/60'>
                                                        {user.status}
                                                    </p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </article>

                            <article className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                <p className='text-sm font-medium text-white/90'>
                                    차단 리스트
                                </p>
                                <input
                                    type='text'
                                    placeholder='유저 검색'
                                    className='mt-3 w-full rounded-md border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none placeholder:text-white/40'
                                />
                                <ul className='mt-3 space-y-2'>
                                    {blockListMock.map((user) => (
                                        <li
                                            key={user.id}
                                            className='rounded-md border border-white/10 bg-black/30 p-2'
                                        >
                                            <div className='flex items-center justify-between gap-2'>
                                                <div className='flex items-center gap-2'>
                                                    <div className='h-8 w-8 rounded-full border border-white/20 bg-slate-800' />
                                                    <div>
                                                        <p className='text-sm'>
                                                            {user.nickname}
                                                        </p>
                                                        <p className='text-[11px] text-white/60'>
                                                            {user.status}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type='button'
                                                    className='rounded border border-emerald-400/40 px-2 py-1 text-xs text-emerald-100 transition hover:bg-emerald-500/20'
                                                >
                                                    차단 해제
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        </div>
                    </section>

                    <section className='rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md'>
                        <h2 className='text-lg font-semibold'>계정 및 보안</h2>
                        <div className='mt-4 grid gap-4 lg:grid-cols-2'>
                            <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                <p className='text-sm font-medium text-white/90'>
                                    프로필 공개 범위
                                </p>
                                <div className='mt-3 space-y-2 text-sm'>
                                    <label className='flex items-center gap-2'>
                                        <input
                                            type='radio'
                                            name='profileVisibility'
                                            defaultChecked
                                            className='accent-cyan-400'
                                        />
                                        전체
                                    </label>
                                    <label className='flex items-center gap-2'>
                                        <input
                                            type='radio'
                                            name='profileVisibility'
                                            className='accent-cyan-400'
                                        />
                                        친구
                                    </label>
                                    <label className='flex items-center gap-2'>
                                        <input
                                            type='radio'
                                            name='profileVisibility'
                                            className='accent-cyan-400'
                                        />
                                        차단
                                    </label>
                                </div>
                            </div>

                            <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
                                <label className='flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-3 py-2'>
                                    <span className='text-sm text-white/90'>
                                        온라인 상태 표시
                                    </span>
                                    <input
                                        type='checkbox'
                                        defaultChecked
                                        className='h-4 w-4 accent-cyan-400'
                                    />
                                </label>

                                <div className='mt-4 grid gap-2'>
                                    <button
                                        type='button'
                                        className='rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm transition hover:bg-white/20'
                                    >
                                        로그아웃 (세션에서 삭제)
                                    </button>
                                    <button
                                        type='button'
                                        className='rounded-md border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/25'
                                    >
                                        회원탈퇴 (유저 테이블 삭제)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
