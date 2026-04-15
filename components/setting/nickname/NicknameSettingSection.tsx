'use client';

import { useState } from 'react';
import { useNicknameAvailability } from '@/hooks/settings/useNicknameAvailability';
import { useNicknameUpdate } from '@/hooks/settings/useNicknameUpdate';

type NicknameSettingSectionProps = {
    currentNickname: string;
    username?: string | null;
    onNicknameChanged?: () => void;
};

const GET_STATUS_MESSAGE_CLASS_NAME = (status: string) =>
    status === 'available'
        ? 'text-green-400'
        : status === 'checking'
          ? 'text-white/60'
          : status === 'same'
            ? 'text-cyan-200'
            : 'text-rose-300';

export function NicknameSettingSection({
    currentNickname,
    username,
    onNicknameChanged,
}: NicknameSettingSectionProps) {
    const [nicknameInput, setNicknameInput] = useState('');
    const { status, message } = useNicknameAvailability({
        inputNickname: nicknameInput,
        currentNickname,
    });
    const { isUpdating, updateError, successMessage, submitNicknameUpdate } =
        useNicknameUpdate({
            username,
            onSuccess: onNicknameChanged,
        });
    const statusMessageClassName = GET_STATUS_MESSAGE_CLASS_NAME(status);
    const canSubmit =
        !isUpdating && !!nicknameInput.trim() && status === 'available';

    const handleUpdateNickname = async () => {
        if (!canSubmit) return;

        const isUpdated = await submitNicknameUpdate(nicknameInput);
        if (isUpdated) {
            setNicknameInput('');
        }
    };

    return (
        <div className='rounded-lg border border-white/10 bg-white/5 p-4'>
            <p className='text-sm font-medium text-white/90'>닉네임</p>
            <p className='mt-1 text-xs text-white/60'>
                현재 닉네임: {currentNickname}
            </p>
            <input
                type='text'
                placeholder='닉네임 입력 (최대 12자)'
                maxLength={12}
                value={nicknameInput}
                onChange={(event) => setNicknameInput(event.target.value)}
                className='mt-3 w-full rounded-md border border-white/15 bg-black/50 px-3 py-2 text-sm outline-none transition placeholder:text-white/40 focus:border-cyan-400/70'
            />
            <div className='mt-2 grid gap-1 text-xs text-white/60'>
                <span>• 공백 금지 / 중복 금지</span>
                <span>• 특수문자 금지 / 최대 12자 미만</span>
            </div>
            {message && (
                <p className={`mt-2 text-xs ${statusMessageClassName}`}>
                    {message}
                </p>
            )}
            {updateError && (
                <p className='mt-2 text-xs text-rose-300'>{updateError}</p>
            )}
            {successMessage && (
                <p className='mt-2 text-xs text-green-400'>{successMessage}</p>
            )}
            <button
                type='button'
                onClick={handleUpdateNickname}
                disabled={!canSubmit}
                className='mt-3 rounded-md border border-cyan-400/50 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/30'
            >
                {isUpdating ? '변경 중...' : '닉네임 변경'}
            </button>

            <div className='mt-4 rounded-md border border-white/10 bg-black/30 p-3'>
                <p className='text-xs font-medium text-white/80'>
                    닉네임 변경 이력 (UI)
                </p>
                <ul className='mt-2 space-y-1 text-xs text-white/60'>
                    <li>2026-04-10: sync_meme</li>
                    <li>2026-03-22: dmeme_park</li>
                </ul>
            </div>
        </div>
    );
}
