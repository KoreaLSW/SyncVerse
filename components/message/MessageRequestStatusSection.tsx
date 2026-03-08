import type { DmRequestItem } from '@/lib/message/types';

type MessageRequestStatusSectionProps = {
    requests: DmRequestItem[];
    isRespondingDm?: boolean;
    isDeletingDm?: boolean;
    requestStatusErrorMessage?: string | null;
    statusClassName: (status: DmRequestItem['status']) => string;
    onRespondDm?: (
        requestId: string,
        action: 'accept' | 'reject' | 'cancel',
    ) => void;
    onDeleteDm?: (requestId: string) => void;
};

export function MessageRequestStatusSection({
    requests,
    isRespondingDm,
    isDeletingDm,
    requestStatusErrorMessage,
    statusClassName,
    onRespondDm,
    onDeleteDm,
}: MessageRequestStatusSectionProps) {
    return (
        <>
            <h4 className='text-sm font-bold mb-2'>요청 상태</h4>
            <div className='space-y-2 max-h-[28vh] overflow-y-auto pr-1'>
                {requestStatusErrorMessage && (
                    <div className='rounded border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200'>
                        {requestStatusErrorMessage}
                    </div>
                )}
                {requests.map((item) => (
                    <div
                        key={item.id}
                        className='rounded border border-white/10 bg-white/5 px-3 py-2'
                    >
                        <div className='mb-1 flex items-center justify-between'>
                            <span className='text-sm'>{item.target}</span>
                            <span
                                className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${statusClassName(
                                    item.status,
                                )}`}
                            >
                                {item.status}
                            </span>
                        </div>
                        <div className='text-[11px] text-white/50'>
                            {item.createdAt}
                        </div>
                        {item.status === '요청중' && (
                            <div className='mt-2 flex gap-2'>
                                {item.canRespond ? (
                                    <>
                                        <button
                                            type='button'
                                            disabled={!!isRespondingDm}
                                            onClick={() =>
                                                onRespondDm?.(item.id, 'accept')
                                            }
                                            className='rounded bg-emerald-500/90 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-500/30 disabled:text-white/60'
                                        >
                                            수락
                                        </button>
                                        <button
                                            type='button'
                                            disabled={!!isRespondingDm}
                                            onClick={() =>
                                                onRespondDm?.(item.id, 'reject')
                                            }
                                            className='rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white/80 hover:bg-white/20 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50'
                                        >
                                            거절
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type='button'
                                        disabled={!!isRespondingDm}
                                        onClick={() => onRespondDm?.(item.id, 'cancel')}
                                        className='rounded bg-amber-500/90 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-500/30 disabled:text-white/60'
                                    >
                                        요청취소
                                    </button>
                                )}
                            </div>
                        )}
                        <div className='mt-2 flex justify-end'>
                            <button
                                type='button'
                                disabled={!!isDeletingDm}
                                onClick={() => onDeleteDm?.(item.id)}
                                className='rounded bg-rose-500/85 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-500/30 disabled:text-white/60'
                            >
                                삭제
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
