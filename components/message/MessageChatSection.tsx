import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { ChatRoomItem, MessageItem } from '@/lib/message/types';

const DELETED_MESSAGE_TEXT = '삭제된 메세지입니다';

type MessageChatSectionProps = {
    selectedRoom: ChatRoomItem | null;
    messages: MessageItem[];
    draft: string;
    onDraftChange: (value: string) => void;
    onSend: () => void;
    isPeerTyping?: boolean;
    peerTypingName?: string;
    onTypingStop?: () => void;
    canSend?: boolean;
    selectedImagePreviews?: Array<{ id: string; name: string; url: string }>;
    onSelectImages?: (files: File[]) => void;
    onRemoveSelectedImage?: (imageId: string) => void;
    isUploadingImage?: boolean;
    isPreparingImage?: boolean;
    onLeaveRoom?: () => void;
    isLeavingRoom?: boolean;
    onBottomStateChange?: (isAtBottom: boolean) => void;
    onDeleteMessage?: (messageId: string) => void;
    deletingMessageId?: string | null;
    isGroupParticipant?: boolean;
    isCheckingRoomAccess?: boolean;
    requiresJoinPassword?: boolean;
    groupJoinPassword?: string;
    onGroupJoinPasswordChange?: (value: string) => void;
    onJoinGroupRoom?: () => void;
    isJoiningGroupRoom?: boolean;
    groupJoinErrorMessage?: string | null;
    groupRoomAccessMeta?: {
        currentParticipants: number;
        maxCapacity: number | null;
    } | null;
    isGroupOwner?: boolean;
};

export function MessageChatSection({
    selectedRoom,
    messages,
    draft,
    onDraftChange,
    onSend,
    isPeerTyping,
    peerTypingName,
    onTypingStop,
    canSend,
    selectedImagePreviews,
    onSelectImages,
    onRemoveSelectedImage,
    isUploadingImage,
    isPreparingImage,
    onLeaveRoom,
    isLeavingRoom,
    onBottomStateChange,
    onDeleteMessage,
    deletingMessageId,
    isGroupParticipant = true,
    isCheckingRoomAccess,
    requiresJoinPassword,
    groupJoinPassword,
    onGroupJoinPasswordChange,
    onJoinGroupRoom,
    isJoiningGroupRoom,
    groupJoinErrorMessage,
    groupRoomAccessMeta,
    isGroupOwner,
}: MessageChatSectionProps) {
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const shouldScrollToBottomRef = useRef(false);
    const previousMessageLengthRef = useRef(0);
    const [openActionMenuMessageId, setOpenActionMenuMessageId] = useState<
        string | null
    >(null);

    useEffect(() => {
        shouldScrollToBottomRef.current = true;
    }, [selectedRoom?.id]);

    useEffect(() => {
        const hasNewMessage = messages.length > previousMessageLengthRef.current;
        if (shouldScrollToBottomRef.current || hasNewMessage) {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop =
                    scrollContainerRef.current.scrollHeight;
            }
            shouldScrollToBottomRef.current = false;
            onBottomStateChange?.(true);
        }
        previousMessageLengthRef.current = messages.length;
    }, [messages.length]);

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= 24;
        onBottomStateChange?.(isAtBottom);
    };

    const handleSendWithAutoScroll = () => {
        if (!selectedRoom?.id || !canSend) return;
        onTypingStop?.();
        shouldScrollToBottomRef.current = true;
        onSend();
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop =
                scrollContainerRef.current.scrollHeight;
        }
    };

    const handleCameraClick = () => {
        if (!selectedRoom?.id || !onSelectImages || isUploadingImage) return;
        fileInputRef.current?.click();
    };

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!files.length || !onSelectImages || !selectedRoom?.id) return;
        onSelectImages(files);
    };

    const shouldShowGroupJoinPanel =
        selectedRoom?.type === 'GROUP' && !isGroupParticipant;

    return (
        <section className='rounded-xl border border-white/10 bg-black/40 backdrop-blur-md flex h-[72vh] min-h-0 flex-col'>
            <div className='flex items-center justify-between border-b border-white/10 px-4 py-3'>
                <div>
                    <div className='text-sm text-white/60'>현재 대화</div>
                    <h2 className='text-lg font-semibold'>
                        {selectedRoom?.name ?? '방을 선택하세요'}
                    </h2>
                </div>
                {selectedRoom && (
                    <div className='flex items-center gap-2'>
                        <span className='rounded bg-white/10 px-2 py-1 text-xs text-white/70'>
                            {selectedRoom.type}
                        </span>
                        {selectedRoom.type === 'DM' && onLeaveRoom ? (
                            <button
                                type='button'
                                disabled={!!isLeavingRoom}
                                onClick={onLeaveRoom}
                                className='rounded bg-rose-500/85 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-500/30 disabled:text-white/60'
                            >
                                {isLeavingRoom ? '나가는 중...' : '나가기'}
                            </button>
                        ) : null}
                        {selectedRoom.type === 'GROUP' &&
                        onLeaveRoom &&
                        isGroupParticipant ? (
                            <button
                                type='button'
                                disabled={!!isLeavingRoom}
                                onClick={onLeaveRoom}
                                className='rounded bg-rose-500/85 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:bg-rose-500/30 disabled:text-white/60'
                            >
                                {isGroupOwner
                                    ? isLeavingRoom
                                        ? '삭제 중...'
                                        : '채팅방 삭제'
                                    : isLeavingRoom
                                      ? '나가는 중...'
                                      : '나가기'}
                            </button>
                        ) : null}
                    </div>
                )}
            </div>

            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onClickCapture={(event) => {
                    const target = event.target as HTMLElement | null;
                    if (!target?.closest('[data-message-actions="true"]')) {
                        setOpenActionMenuMessageId(null);
                    }
                }}
                className='min-h-0 flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-color:rgba(96,165,250,0.55)_rgba(15,23,42,0.45)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-900/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-300/45 [&::-webkit-scrollbar-thumb:hover]:bg-cyan-300/55'
            >
                {shouldShowGroupJoinPanel ? (
                    <div className='flex h-full items-center justify-center'>
                        <div className='w-full max-w-sm rounded-xl border border-white/15 bg-white/5 p-4'>
                            <h3 className='text-sm font-semibold'>그룹 채팅방 참여</h3>
                            <p className='mt-2 text-xs text-white/65'>
                                아직 이 그룹 채팅방에 참여하지 않았습니다.
                            </p>
                            {groupRoomAccessMeta ? (
                                <p className='mt-1 text-xs text-white/55'>
                                    현재 인원 {groupRoomAccessMeta.currentParticipants}명
                                    {groupRoomAccessMeta.maxCapacity !== null
                                        ? ` / 최대 ${groupRoomAccessMeta.maxCapacity}명`
                                        : ''}
                                </p>
                            ) : null}
                            {requiresJoinPassword ? (
                                <div className='mt-3'>
                                    <label className='mb-1 block text-xs text-white/65'>
                                        비밀번호
                                    </label>
                                    <input
                                        type='password'
                                        value={groupJoinPassword ?? ''}
                                        onChange={(event) =>
                                            onGroupJoinPasswordChange?.(event.target.value)
                                        }
                                        placeholder='비밀번호를 입력하세요'
                                        className='w-full rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/70'
                                    />
                                </div>
                            ) : null}
                            {groupJoinErrorMessage ? (
                                <div className='mt-3 rounded border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200'>
                                    {groupJoinErrorMessage}
                                </div>
                            ) : null}
                            <button
                                type='button'
                                onClick={onJoinGroupRoom}
                                disabled={!!isCheckingRoomAccess || !!isJoiningGroupRoom}
                                className='mt-4 w-full rounded bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40 disabled:text-white/70'
                            >
                                {isCheckingRoomAccess
                                    ? '확인 중...'
                                    : isJoiningGroupRoom
                                      ? '참여 중...'
                                      : '참여하기'}
                            </button>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className='h-full flex items-center justify-center text-white/50 text-sm'>
                        메시지가 없습니다.
                    </div>
                ) : (
                    messages.map((message) => (
                        (() => {
                            const isDeletedMessage =
                                message.content.trim() === DELETED_MESSAGE_TEXT;
                            return (
                        <div
                            key={message.id}
                            className={`flex ${
                                message.isMine ? 'justify-end' : 'justify-start'
                            }`}
                        >
                            <div
                                className={`group relative max-w-[70%] rounded-xl px-3 py-2 ${
                                    message.isMine
                                        ? 'bg-blue-500/90 text-white'
                                        : 'bg-white/10 text-white'
                                } ${
                                    message.isMine &&
                                    onDeleteMessage &&
                                    !isDeletedMessage
                                        ? 'pt-5'
                                        : ''
                                }`}
                            >
                                {message.isMine &&
                                onDeleteMessage &&
                                !isDeletedMessage ? (
                                    <div
                                        data-message-actions='true'
                                        className='absolute right-1.5 top-1.5'
                                    >
                                        <button
                                            type='button'
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setOpenActionMenuMessageId((prev) =>
                                                    prev === message.id
                                                        ? null
                                                        : message.id,
                                                );
                                            }}
                                            className='inline-flex h-5 w-5 items-center justify-center rounded text-xs font-semibold text-white/60 opacity-0 transition hover:bg-black/20 hover:text-white group-hover:opacity-100'
                                            aria-label='메시지 액션'
                                            title='메시지 액션'
                                        >
                                            ⋯
                                        </button>
                                        {openActionMenuMessageId === message.id ? (
                                            <div className='absolute right-0 z-20 mt-1 min-w-[76px] rounded-md border border-white/15 bg-slate-900/95 p-1 shadow-xl'>
                                                <button
                                                    type='button'
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onDeleteMessage(message.id);
                                                        setOpenActionMenuMessageId(
                                                            null,
                                                        );
                                                    }}
                                                    disabled={
                                                        deletingMessageId ===
                                                        message.id
                                                    }
                                                    className='w-full rounded px-2 py-1 text-left text-xs text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:text-rose-200/50'
                                                >
                                                    {deletingMessageId === message.id
                                                        ? '삭제 중...'
                                                        : '삭제'}
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                                {!message.isMine && (
                                    <div className='mb-1 text-[11px] text-white/60'>
                                        {message.sender}
                                    </div>
                                )}
                                {message.content.trim() ? (
                                    <p className='text-sm whitespace-pre-wrap'>
                                        {isDeletedMessage ? (
                                            <span className='italic text-white/60'>
                                                {DELETED_MESSAGE_TEXT}
                                            </span>
                                        ) : (
                                            message.content
                                        )}
                                    </p>
                                ) : null}
                                {!isDeletedMessage && message.attachments?.length ? (
                                    <div className='mt-2 space-y-2'>
                                        {message.attachments.map((attachment) => {
                                            if (attachment.resourceType !== 'IMAGE') {
                                                return null;
                                            }
                                            return (
                                                <a
                                                    key={attachment.id}
                                                    href={attachment.secureUrl}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                    className='block'
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={attachment.secureUrl}
                                                        alt='첨부 이미지'
                                                        className='max-h-80 w-full rounded-lg border border-white/15 object-cover'
                                                        loading='lazy'
                                                    />
                                                </a>
                                            );
                                        })}
                                    </div>
                                ) : null}
                                <div className='mt-1 flex items-center justify-end gap-1 text-[11px] text-white/60'>
                                    {message.isMine && message.isReadByPeer ? (
                                        <span className='text-emerald-200/90'>읽음</span>
                                    ) : null}
                                    <span>{message.createdAt}</span>
                                </div>
                            </div>
                        </div>
                            );
                        })()
                    ))
                )}
            </div>

            <div className='border-t border-white/10 p-3'>
                {shouldShowGroupJoinPanel ? null : (
                    <>
                {isPeerTyping ? (
                    <div className='mb-2 text-xs text-cyan-200/90'>
                        {peerTypingName || '상대방'}님이 입력 중...
                    </div>
                ) : null}
                {selectedImagePreviews?.length ? (
                    <div className='mb-2 flex flex-wrap items-start gap-2'>
                        {selectedImagePreviews.map((preview) => (
                            <div
                                key={preview.id}
                                className='relative h-14 w-14 overflow-hidden rounded-md border border-white/15 bg-black/30'
                                title={preview.name}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={preview.url}
                                    alt={preview.name}
                                    className='h-full w-full object-cover'
                                    loading='lazy'
                                />
                                {onRemoveSelectedImage ? (
                                    <button
                                        type='button'
                                        onClick={() => onRemoveSelectedImage(preview.id)}
                                        className='absolute right-0 top-0 bg-black/70 px-1 text-[10px] text-white hover:bg-black/90'
                                        aria-label='선택 이미지 제거'
                                    >
                                        x
                                    </button>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : null}
                <div className='flex items-center gap-2'>
                <button
                    type='button'
                    aria-label='사진'
                    title='사진'
                    onClick={handleCameraClick}
                    disabled={
                        !selectedRoom?.id ||
                        !onSelectImages ||
                        !!isUploadingImage ||
                        !!isPreparingImage
                    }
                    className='rounded bg-white/10 p-2 text-white/70 hover:bg-white/20'
                >
                    <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.8'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        className='h-4 w-4'
                    >
                        <path d='M4 7h3l1.2-2h7.6L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z' />
                        <circle cx='12' cy='13' r='3.5' />
                    </svg>
                </button>
                <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    multiple
                    onChange={handleImageChange}
                    className='hidden'
                />
                {selectedImagePreviews?.length ? (
                    <div className='rounded bg-cyan-400/15 px-2 py-1 text-xs text-cyan-100'>
                        사진 {selectedImagePreviews.length}장 선택됨
                    </div>
                ) : null}
                <input
                    value={draft}
                    onChange={(event) => {
                        const next = event.target.value;
                        onDraftChange(next);
                    }}
                    onBlur={() => onTypingStop?.()}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            handleSendWithAutoScroll();
                        }
                    }}
                    placeholder='메시지를 입력하세요'
                    className='flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/70'
                />
                <button
                    type='button'
                    onClick={handleSendWithAutoScroll}
                    disabled={!!isUploadingImage || !!isPreparingImage || !canSend}
                    className='rounded bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400'
                >
                    {isPreparingImage
                        ? '압축 중...'
                        : isUploadingImage
                          ? '업로드 중...'
                          : '전송'}
                </button>
                </div>
                    </>
                )}
            </div>
        </section>
    );
}
