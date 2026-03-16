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
    attachments?: MessageAttachmentItem[];
    createdAt: string;
    isMine?: boolean;
    isReadByPeer?: boolean;
};

export type MessageAttachmentItem = {
    id: string;
    provider: 'CLOUDINARY';
    resourceType: 'IMAGE' | 'VIDEO' | 'FILE';
    publicId: string;
    secureUrl: string;
    format?: string | null;
    width?: number | null;
    height?: number | null;
    bytes?: number | null;
};

export type DmRequestItem = {
    id: string;
    target: string;
    status: RequestStatus;
    createdAt: string;
    direction?: 'sent' | 'received';
    canRespond?: boolean;
};

export type SearchUserItem = {
    id: string;
    username: string;
    nickname: string;
};
