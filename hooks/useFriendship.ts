import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FriendStatus } from '@/lib/friends';
import {
    acceptFriend,
    getFriendStatus,
    requestFriend,
    removeFriend,
} from '@/lib/friends';
import type { AuthUser } from '@/lib/auth';
import { useFriendsStore } from '@/stores/friendsStore';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

type ContextMenuState = {
    x: number;
    y: number;
    playerId: string;
    nickname?: string;
    isTargetGuest: boolean;
    friendStatus: FriendStatus;
    isFriendStatusLoading: boolean;
};

export function useFriendship(user: AuthUser | null) {
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
        null,
    );
    const { addFriend, removeFriend: removeFriendFromStore } =
        useFriendsStore();

    const isAuthAvailable = !!user && user.authType !== 'guest';
    const statusKey = useMemo(
        () =>
            contextMenu &&
            contextMenu.playerId &&
            !contextMenu.isTargetGuest &&
            isAuthAvailable
                ? (['friends-status', contextMenu.playerId] as const)
                : null,
        [contextMenu?.playerId, contextMenu?.isTargetGuest, isAuthAvailable],
    );

    // 친구 상태 조회는 SWR 캐시를 사용한다.
    const {
        data: statusData,
        error: statusError,
        isLoading: isStatusLoading,
        mutate: mutateStatus,
    } = useSWR<FriendStatus>(
        statusKey,
        ([, targetId]) => getFriendStatus(String(targetId)),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            shouldRetryOnError: false,
        },
    );

    // 친구 요청/수락/해제는 useSWRMutation으로 처리한다.
    const { trigger: triggerRequest, isMutating: isRequestMutating } =
        useSWRMutation(
            '/api/friends/request',
            async (
                _key,
                { arg }: { arg: { targetId: string } },
            ): Promise<FriendStatus> => {
                return requestFriend(arg.targetId);
            },
        );
    const { trigger: triggerAccept, isMutating: isAcceptMutating } =
        useSWRMutation(
            '/api/friends/accept',
            async (
                _key,
                { arg }: { arg: { targetId: string } },
            ): Promise<FriendStatus> => {
                return acceptFriend(arg.targetId);
            },
        );
    const { trigger: triggerRemove, isMutating: isRemoveMutating } =
        useSWRMutation(
            '/api/friends/remove',
            async (
                _key,
                { arg }: { arg: { targetId: string } },
            ): Promise<FriendStatus> => {
                return removeFriend(arg.targetId);
            },
        );

    const isActionMutating =
        isRequestMutating || isAcceptMutating || isRemoveMutating;

    // SWR 조회 결과를 컨텍스트 메뉴 상태에 동기화한다.
    useEffect(() => {
        if (!contextMenu?.playerId) return;

        if (contextMenu.isTargetGuest || !isAuthAvailable) {
            setContextMenu((prev) =>
                !prev
                    ? prev
                    : prev.friendStatus === 'UNAVAILABLE' &&
                        !prev.isFriendStatusLoading
                      ? prev
                      : {
                            ...prev,
                            friendStatus: 'UNAVAILABLE',
                            isFriendStatusLoading: false,
                        },
            );
            return;
        }

        if (isStatusLoading) {
            setContextMenu((prev) =>
                !prev || prev.isFriendStatusLoading
                    ? prev
                    : { ...prev, isFriendStatusLoading: true },
            );
            return;
        }

        if (statusError) {
            console.error('친구 상태 조회 실패:', statusError);
            setContextMenu((prev) =>
                !prev
                    ? prev
                    : prev.friendStatus === 'ERROR' &&
                        !prev.isFriendStatusLoading
                      ? prev
                      : {
                            ...prev,
                            friendStatus: 'ERROR',
                            isFriendStatusLoading: false,
                        },
            );
            return;
        }

        setContextMenu((prev) =>
            !prev
                ? prev
                : prev.friendStatus === (statusData ?? 'NONE') &&
                    prev.isFriendStatusLoading === isActionMutating
                  ? prev
                  : {
                        ...prev,
                        friendStatus: statusData ?? 'NONE',
                        isFriendStatusLoading: isActionMutating,
                    },
        );
    }, [
        contextMenu?.playerId,
        contextMenu?.isTargetGuest,
        isAuthAvailable,
        isStatusLoading,
        isActionMutating,
        statusData,
        statusError,
    ]);

    // 우클릭 위치에 컨텍스트 메뉴를 열고 상태 조회를 시작한다.
    const openContextMenu = useCallback(
        (
            event: React.MouseEvent<HTMLDivElement>,
            playerId: string,
            nickname?: string,
        ) => {
            event.preventDefault();
            const rect = (
                event.currentTarget.closest(
                    '[data-viewport]',
                ) as HTMLDivElement | null
            )?.getBoundingClientRect();
            const x = rect ? event.clientX - rect.left : event.clientX;
            const y = rect ? event.clientY - rect.top : event.clientY;
            const isTargetGuest =
                playerId.startsWith('guest_') || playerId.startsWith('temp_');

            setContextMenu({
                x,
                y,
                playerId,
                nickname,
                isTargetGuest,
                friendStatus: 'NONE',
                isFriendStatusLoading:
                    !isTargetGuest && !!user && user.authType !== 'guest',
            });
        },
        [user],
    );

    // 컨텍스트 메뉴를 닫는다.
    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // 현재 상태에 따라 친구 요청/수락/해제를 처리한다.
    const handleFriendAction = useCallback(async () => {
        if (!contextMenu) return;
        if (contextMenu.isFriendStatusLoading || isActionMutating) return;

        if (!user || user.authType === 'guest') {
            alert('구글 로그인 후 이용 가능합니다.');
            return;
        }

        const targetId = contextMenu.playerId;
        const currentStatus = contextMenu.friendStatus;

        try {
            setContextMenu((prev) =>
                prev ? { ...prev, isFriendStatusLoading: true } : prev,
            );

            // 친구 요청
            if (currentStatus === 'NONE') {
                const nextStatus = await triggerRequest({ targetId });
                setContextMenu((prev) =>
                    prev
                        ? {
                              ...prev,
                              friendStatus: nextStatus,
                              isFriendStatusLoading: false,
                          }
                        : prev,
                );
                mutateStatus(nextStatus, { revalidate: false });
                // 친구 요청 성공 시 친구 추가
                if (nextStatus === 'ACCEPTED') addFriend(targetId);
                return;
            }
            // 친구 수락
            if (currentStatus === 'PENDING_RECEIVED') {
                const nextStatus = await triggerAccept({ targetId });
                setContextMenu((prev) =>
                    prev
                        ? {
                              ...prev,
                              friendStatus: nextStatus,
                              isFriendStatusLoading: false,
                          }
                        : prev,
                );
                mutateStatus(nextStatus, { revalidate: false });
                if (nextStatus === 'ACCEPTED') addFriend(targetId);
                return;
            }
            // 친구 해제
            if (
                currentStatus === 'ACCEPTED' ||
                currentStatus === 'PENDING_SENT'
            ) {
                const nextStatus = await triggerRemove({ targetId });
                setContextMenu((prev) =>
                    prev
                        ? {
                              ...prev,
                              friendStatus: nextStatus,
                              isFriendStatusLoading: false,
                          }
                        : prev,
                );
                mutateStatus(nextStatus, { revalidate: false });
                if (nextStatus === 'NONE') removeFriendFromStore(targetId);
                return;
            }

            setContextMenu((prev) =>
                prev ? { ...prev, isFriendStatusLoading: false } : prev,
            );
        } catch (error: any) {
            const fallbackStatus = error?.response?.data?.status ?? 'ERROR';
            console.error('친구 액션 실패:', error);
            setContextMenu((prev) =>
                prev
                    ? {
                          ...prev,
                          friendStatus: fallbackStatus,
                          isFriendStatusLoading: false,
                      }
                    : prev,
            );
        }
    }, [
        contextMenu,
        user,
        isActionMutating,
        triggerRequest,
        triggerAccept,
        triggerRemove,
        mutateStatus,
        addFriend,
        removeFriendFromStore,
    ]);

    // 컨텍스트 메뉴 상태 및 친구 액션 핸들러를 반환한다.
    return {
        contextMenu,
        openContextMenu,
        closeContextMenu,
        handleFriendAction,
    };
}
