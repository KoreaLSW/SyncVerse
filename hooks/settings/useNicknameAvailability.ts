import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { checkNicknameDuplicate } from '@/lib/settings/nickname';

const NICKNAME_REGEX = /^[A-Za-z0-9가-힣]{1,12}$/;

type UseNicknameAvailabilityParams = {
    inputNickname: string;
    currentNickname: string;
    debounceMs?: number;
};

export function useNicknameAvailability({
    inputNickname,
    currentNickname,
    debounceMs = 500,
}: UseNicknameAvailabilityParams) {
    const [debouncedNickname, setDebouncedNickname] = useState('');

    const trimmedInput = inputNickname.trim();
    const trimmedCurrent = currentNickname.trim();

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedNickname(trimmedInput);
        }, debounceMs);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [trimmedInput, debounceMs]);

    const formatError = useMemo(() => {
        if (!debouncedNickname) return null;
        return NICKNAME_REGEX.test(debouncedNickname)
            ? null
            : '공백/특수문자 없이 12자 이하로 입력해 주세요.';
    }, [debouncedNickname]);

    const isSameAsCurrent =
        !!debouncedNickname &&
        debouncedNickname.toLowerCase() === trimmedCurrent.toLowerCase();

    const shouldCheckDuplicate =
        !!debouncedNickname && !formatError && !isSameAsCurrent;

    const { data, error, isLoading } = useSWR(
        shouldCheckDuplicate
            ? (['nickname-duplicate-check', debouncedNickname] as const)
            : null,
        ([, nickname]) => checkNicknameDuplicate(nickname),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            shouldRetryOnError: false,
        }
    );

    const status = useMemo<
        'idle' | 'invalid' | 'same' | 'checking' | 'duplicate' | 'available' | 'error'
    >(() => {
        if (!debouncedNickname) return 'idle';
        if (formatError) return 'invalid';
        if (isSameAsCurrent) return 'same';
        if (isLoading) return 'checking';
        if (error) return 'error';
        if (data?.isDuplicate) return 'duplicate';
        return 'available';
    }, [debouncedNickname, formatError, isSameAsCurrent, isLoading, error, data]);

    const message = useMemo(() => {
        switch (status) {
            case 'invalid':
                return formatError;
            case 'same':
                return '현재 사용 중인 닉네임입니다.';
            case 'checking':
                return '중복 여부를 확인하고 있습니다...';
            case 'duplicate':
                return '이미 사용 중인 닉네임입니다.';
            case 'available':
                return '사용 가능한 닉네임입니다.';
            case 'error':
                return '중복 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
            default:
                return null;
        }
    }, [status, formatError]);

    return {
        status,
        message,
        isSubmittable: status === 'available' || status === 'same',
    };
}
