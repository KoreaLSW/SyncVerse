interface CharacterContextMenuProps {
    x: number;
    y: number;
    nickname?: string;
    onClose: () => void;
    friendActionLabel: string;
    onFriendAction?: () => void;
    friendActionDisabled?: boolean;
}

export function CharacterContextMenu({
    x,
    y,
    nickname,
    onClose,
    friendActionLabel,
    onFriendAction,
    friendActionDisabled = false,
}: CharacterContextMenuProps) {
    return (
        <div
            className='absolute z-50 min-w-[160px] rounded-lg border border-white/10 bg-black/80 text-white shadow-2xl backdrop-blur-md'
            style={{
                left: x,
                top: y,
            }}
            onMouseDown={(event) => event.stopPropagation()}
        >
            <div className='px-3 py-2 text-xs text-white/60 border-b border-white/10'>
                {nickname?.trim() || '익명'}
            </div>
            <button
                type='button'
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                    friendActionDisabled
                        ? 'text-white/40 cursor-not-allowed'
                        : 'hover:bg-white/10'
                }`}
                onClick={friendActionDisabled ? undefined : onFriendAction}
                disabled={friendActionDisabled}
            >
                {friendActionLabel}
            </button>
            <button
                type='button'
                className='w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors'
                onClick={onClose}
            >
                차단
            </button>
            <button
                type='button'
                className='w-full px-3 py-2 text-left text-sm hover:bg-white/10 transition-colors'
                onClick={onClose}
            >
                1:1 대화 걸기
            </button>
        </div>
    );
}
