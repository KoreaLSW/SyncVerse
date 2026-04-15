import { useState } from 'react';
import { updateNickname } from '@/lib/settings/nickname';

type UseNicknameUpdateParams = {
    username?: string | null;
    onSuccess?: () => void;
};

export function useNicknameUpdate({
    username,
    onSuccess,
}: UseNicknameUpdateParams) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const submitNicknameUpdate = async (nextNickname: string) => {
        const trimmedUsername = username?.trim();
        const trimmedNickname = nextNickname.trim();

        if (!trimmedUsername || !trimmedNickname) {
            setUpdateError('사용자 또는 닉네임 정보를 확인해 주세요.');
            setSuccessMessage(null);
            return false;
        }

        setIsUpdating(true);
        setUpdateError(null);
        setSuccessMessage(null);

        try {
            await updateNickname(trimmedUsername, trimmedNickname);
            setSuccessMessage('닉네임이 변경되었습니다.');
            onSuccess?.();
            return true;
        } catch (error: any) {
            const status = error?.response?.status;
            const apiMessage = String(error?.response?.data?.error ?? '');

            if (status === 409) {
                setUpdateError('이미 사용 중인 닉네임입니다.');
            } else if (status === 400) {
                setUpdateError(
                    apiMessage || '닉네임 형식을 확인해 주세요. (최대 12자)'
                );
            } else {
                setUpdateError('닉네임 변경에 실패했습니다. 다시 시도해 주세요.');
            }

            return false;
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        isUpdating,
        updateError,
        successMessage,
        submitNicknameUpdate,
    };
}
