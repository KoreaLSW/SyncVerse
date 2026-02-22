import { useCallback, useState } from 'react';
import type { FriendStatus } from '@/lib/friends';
import {
    acceptFriend,
    getFriendStatus,
    requestFriend,
    removeFriend,
} from '@/lib/friends';
import type { AuthUser } from '@/lib/auth';
import { useFriendsStore } from '@/stores/friendsStore';

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

    // 대상의 친구 상태를 조회하고 컨텍스트 메뉴에 반영한다.
    const loadFriendStatus = useCallback(
        async (targetId: string, isTargetGuest: boolean) => {
            if (isTargetGuest || !user || user.authType === 'guest') {
                setContextMenu((prev) =>
                    prev
                        ? {
                              ...prev,
                              friendStatus: 'UNAVAILABLE',
                              isFriendStatusLoading: false,
                          }
                        : prev,
                );
                return;
            }

            try {
                const status = await getFriendStatus(targetId);
                setContextMenu((prev) =>
                    prev
                        ? {
                              ...prev,
                              friendStatus: status,
                              isFriendStatusLoading: false,
                          }
                        : prev,
                );
            } catch (error) {
                console.error('친구 상태 조회 실패:', error);
                setContextMenu((prev) =>
                    prev
                        ? {
                              ...prev,
                              friendStatus: 'ERROR',
                              isFriendStatusLoading: false,
                          }
                        : prev,
                );
            }
        },
        [user],
    );

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
                isFriendStatusLoading: true,
            });

            loadFriendStatus(playerId, isTargetGuest);
        },
        [loadFriendStatus],
    );

    // 컨텍스트 메뉴를 닫는다.
    const closeContextMenu = useCallback(() => {
        setContextMenu(null);
    }, []);

    // 현재 상태에 따라 친구 요청/수락/해제를 처리한다.
    const handleFriendAction = useCallback(async () => {
        if (!contextMenu) return;
        if (contextMenu.isFriendStatusLoading) return;

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

            if (currentStatus === 'NONE') {
                const nextStatus = await requestFriend(targetId);
                setContextMenu((prev) =>
                    prev
                        ? {
                              ...prev,
                              friendStatus: nextStatus,
                              isFriendStatusLoading: false,
                          }
                        : prev,
                );
                if (nextStatus === 'ACCEPTED') addFriend(targetId);
                return;
            }

            if (currentStatus === 'PENDING_RECEIVED') {
                const nextStatus = await acceptFriend(targetId);
                setContextMenu((prev) =>
                    prev
                        ? {
                              ...prev,
                              friendStatus: nextStatus,
                              isFriendStatusLoading: false,
                          }
                        : prev,
                );
                if (nextStatus === 'ACCEPTED') addFriend(targetId);
                return;
            }

            if (
                currentStatus === 'ACCEPTED' ||
                currentStatus === 'PENDING_SENT'
            ) {
                const nextStatus = await removeFriend(targetId);
                setContextMenu((prev) =>
                    prev
                        ? {
                              ...prev,
                              friendStatus: nextStatus,
                              isFriendStatusLoading: false,
                          }
                        : prev,
                );
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
    }, [contextMenu, user, addFriend, removeFriendFromStore]);

    // 컨텍스트 메뉴 상태 및 친구 액션 핸들러를 반환한다.
    return {
        contextMenu,
        openContextMenu,
        closeContextMenu,
        handleFriendAction,
    };
}
