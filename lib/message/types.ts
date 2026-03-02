export type RoomType = 'MAIN' | 'GROUP' | 'DM';
export type RoomFilter = 'ALL' | RoomType;

export type RequestStatus =
    | '요청중'
    | '수락'
    | '거절'
    | '취소'
    | '만료';

export type ChatRoomItem = {
    id: string;
    name: string;
    type: RoomType;
    memberCount?: number;
    unreadCount: number;
    latestMessage: string;
    latestAt: string;
};

export type MessageItem = {
    id: string;
    sender: string;
    content: string;
    createdAt: string;
    isMine?: boolean;
};

export type DmRequestItem = {
    id: string;
    target: string;
    status: RequestStatus;
    createdAt: string;
};
