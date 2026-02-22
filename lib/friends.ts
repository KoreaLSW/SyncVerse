import { apiClient } from './api';

export type FriendStatus =
    | 'NONE'
    | 'PENDING_SENT'
    | 'PENDING_RECEIVED'
    | 'ACCEPTED'
    | 'UNAVAILABLE'
    | 'ERROR';

// 상대와의 친구 상태를 조회한다.
export async function getFriendStatus(targetId: string) {
    const res = await apiClient.get('/api/friends/status', {
        params: { userId: targetId },
    });
    return res.data.status as FriendStatus;
}

// 친구 요청을 생성한다.
export async function requestFriend(receiverId: string) {
    const res = await apiClient.post('/api/friends/request', {
        receiverId,
    });
    return res.data.status as FriendStatus;
}

// 받은 친구 요청을 수락한다.
export async function acceptFriend(senderId: string) {
    const res = await apiClient.post('/api/friends/accept', {
        senderId,
    });
    return res.data.status as FriendStatus;
}

// 친구 관계를 해제한다.
export async function removeFriend(targetId: string) {
    const res = await apiClient.post('/api/friends/remove', {
        targetId,
    });
    return (res.data.status as FriendStatus) || 'NONE';
}

// 상태값을 UI 버튼 라벨로 변환한다.
export function getFriendActionLabel(
    status: FriendStatus,
    isLoadingStatus: boolean,
    isTargetGuest: boolean,
) {
    if (isLoadingStatus) return '로딩...';
    if (isTargetGuest) return '게스트 불가';
    switch (status) {
        case 'ACCEPTED':
            return '친구해제';
        case 'PENDING_SENT':
            return '요청취소';
        case 'PENDING_RECEIVED':
            return '수락하기';
        case 'UNAVAILABLE':
            return '로그인 필요';
        case 'ERROR':
            return '오류';
        default:
            return '친구추가';
    }
}
