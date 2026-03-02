import type {
    ChatRoomItem,
    DmRequestItem,
    MessageItem,
    RequestStatus,
    RoomFilter,
} from './types';

export const ROOM_FILTERS: RoomFilter[] = ['ALL', 'MAIN', 'GROUP', 'DM'];

export const ROOM_MOCK: ChatRoomItem[] = [
    {
        id: 'main-1',
        name: '메인 광장',
        type: 'MAIN',
        memberCount: 38,
        unreadCount: 2,
        latestMessage: '환영합니다!',
        latestAt: '09:42',
    },
    {
        id: 'group-1',
        name: '프로젝트 A',
        type: 'GROUP',
        memberCount: 5,
        unreadCount: 0,
        latestMessage: '오늘 배포 전에 체크 부탁해요.',
        latestAt: '08:20',
    },
    {
        id: 'dm-1',
        name: '하늘',
        type: 'DM',
        unreadCount: 4,
        latestMessage: '방금 요청 확인했어요.',
        latestAt: '방금',
    },
    {
        id: 'dm-2',
        name: '민준',
        type: 'DM',
        unreadCount: 0,
        latestMessage: '내일 저녁 괜찮아?',
        latestAt: '어제',
    },
];

export const MESSAGE_MOCK: Record<string, MessageItem[]> = {
    'main-1': [
        {
            id: 'm1',
            sender: '운영봇',
            content: '메인 광장에 입장하신 것을 환영합니다.',
            createdAt: '09:32',
        },
        {
            id: 'm2',
            sender: '나',
            content: '안녕하세요!',
            createdAt: '09:41',
            isMine: true,
        },
    ],
    'group-1': [
        {
            id: 'g1',
            sender: '지훈',
            content: 'API 응답 포맷 맞춰서 올렸어요.',
            createdAt: '08:03',
        },
        {
            id: 'g2',
            sender: '나',
            content: '좋아요, 저녁에 테스트해볼게요.',
            createdAt: '08:20',
            isMine: true,
        },
    ],
    'dm-1': [
        {
            id: 'd1',
            sender: '하늘',
            content: '친구 요청 수락했어요!',
            createdAt: '09:40',
        },
        {
            id: 'd2',
            sender: '나',
            content: '고마워요. 1:1 대화 UI 만들고 있어요.',
            createdAt: '09:42',
            isMine: true,
        },
    ],
    'dm-2': [
        {
            id: 'd3',
            sender: '민준',
            content: '내일 오전 회의 가능?',
            createdAt: '어제',
        },
    ],
};

export const FRIEND_MOCK = ['하늘', '민준', '수빈', '도윤'];
export const SEARCH_USER_MOCK = ['하늘', '민준', '서연', '예린', '준호', '태영'];

export const DM_REQUEST_MOCK: DmRequestItem[] = [
    { id: 'r1', target: '하늘', status: '요청중', createdAt: '방금' },
    { id: 'r2', target: '서연', status: '수락', createdAt: '12분 전' },
    { id: 'r3', target: '예린', status: '거절', createdAt: '1시간 전' },
];

export function statusClassName(status: RequestStatus) {
    if (status === '수락') return 'bg-emerald-500/90 text-white';
    if (status === '요청중') return 'bg-blue-500/90 text-white';
    if (status === '거절') return 'bg-rose-500/90 text-white';
    if (status === '취소') return 'bg-white/20 text-white';
    return 'bg-amber-500/90 text-black';
}
