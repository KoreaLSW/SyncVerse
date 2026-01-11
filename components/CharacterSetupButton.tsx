'use client';

import { useRouter } from 'next/navigation';

export function CharacterSetupButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push('/character-setup?mode=edit')}
            className='bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-lg text-sm transition'
        >
            캐릭터 수정
        </button>
    );
}
