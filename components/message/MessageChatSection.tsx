import type { ChatRoomItem, MessageItem } from '@/lib/message/types';

type MessageChatSectionProps = {
    selectedRoom: ChatRoomItem | null;
    messages: MessageItem[];
    draft: string;
    onDraftChange: (value: string) => void;
    onSend: () => void;
};

export function MessageChatSection({
    selectedRoom,
    messages,
    draft,
    onDraftChange,
    onSend,
}: MessageChatSectionProps) {
    return (
        <section className='rounded-xl border border-white/10 bg-black/40 backdrop-blur-md flex min-h-[72vh] flex-col'>
            <div className='flex items-center justify-between border-b border-white/10 px-4 py-3'>
                <div>
                    <div className='text-sm text-white/60'>현재 대화</div>
                    <h2 className='text-lg font-semibold'>
                        {selectedRoom?.name ?? '방을 선택하세요'}
                    </h2>
                </div>
                {selectedRoom && (
                    <span className='rounded bg-white/10 px-2 py-1 text-xs text-white/70'>
                        {selectedRoom.type}
                    </span>
                )}
            </div>

            <div className='flex-1 space-y-3 overflow-y-auto p-4'>
                {messages.length === 0 ? (
                    <div className='h-full flex items-center justify-center text-white/50 text-sm'>
                        메시지가 없습니다.
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${
                                message.isMine ? 'justify-end' : 'justify-start'
                            }`}
                        >
                            <div
                                className={`max-w-[70%] rounded-xl px-3 py-2 ${
                                    message.isMine
                                        ? 'bg-blue-500/90 text-white'
                                        : 'bg-white/10 text-white'
                                }`}
                            >
                                {!message.isMine && (
                                    <div className='mb-1 text-[11px] text-white/60'>
                                        {message.sender}
                                    </div>
                                )}
                                <p className='text-sm whitespace-pre-wrap'>
                                    {message.content}
                                </p>
                                <div className='mt-1 text-[11px] text-white/60 text-right'>
                                    {message.createdAt}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className='border-t border-white/10 p-3 flex items-center gap-2'>
                <button
                    type='button'
                    className='rounded bg-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/20'
                >
                    사진
                </button>
                <input
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            onSend();
                        }
                    }}
                    placeholder='메시지를 입력하세요'
                    className='flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-400/70'
                />
                <button
                    type='button'
                    onClick={onSend}
                    className='rounded bg-blue-500 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-400'
                >
                    전송
                </button>
            </div>
        </section>
    );
}
