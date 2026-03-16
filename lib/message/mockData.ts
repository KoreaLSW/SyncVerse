import type {
    RequestStatus,
    RoomFilter,
} from './types';

export const ROOM_FILTERS: RoomFilter[] = ['ALL', 'MAIN', 'GROUP', 'DM'];

export function statusClassName(status: RequestStatus) {
    if (status === '수락') return 'bg-emerald-500/90 text-white';
    if (status === '요청중') return 'bg-blue-500/90 text-white';
    if (status === '거절') return 'bg-rose-500/90 text-white';
    if (status === '취소') return 'bg-white/20 text-white';
    return 'bg-amber-500/90 text-black';
}
