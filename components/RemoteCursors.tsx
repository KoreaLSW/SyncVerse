import React from 'react';
import { RemoteUser } from '@/lib/whiteboardTypes';
import { useFriendsStore } from '@/stores/friendsStore';

interface RemoteCursorsProps {
    remoteUsers: RemoteUser[];
    scale: number;
    offset: { x: number; y: number };
    myCursorRef: React.RefObject<HTMLDivElement | null>;
    isMouseOver: boolean;
    isPanning: boolean;
}

export function RemoteCursors({ remoteUsers, scale, offset, myCursorRef, isMouseOver, isPanning }: RemoteCursorsProps) {
    const friendsSet = useFriendsStore((state) => state.friendsSet);
    return (
        <>
            {/* 원격 접속자 마우스 커서 */}
            {remoteUsers.map((remoteUser) => {
                const isFriend =
                    !!remoteUser.userId && friendsSet.has(remoteUser.userId);
                return (
                    <div
                        key={remoteUser.clientId}
                        className="pointer-events-none absolute z-50 transition-all duration-75 ease-out"
                        style={{
                            left: remoteUser.pos.x * scale + offset.x,
                            top: remoteUser.pos.y * scale + offset.y,
                            transform: 'translate(-2px, -2px)',
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))' }}>
                            <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill={remoteUser.color} stroke="white" strokeWidth="1.5" />
                        </svg>
                        <div className="ml-3 flex items-center gap-1 whitespace-nowrap">
                            <div
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-black"
                                style={{ backgroundColor: remoteUser.color }}
                            >
                                {remoteUser.name}
                            </div>
                            {isFriend && (
                                <span className="rounded bg-emerald-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    친구
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* 내 마우스 커서 */}
            {isMouseOver && !isPanning && (
                <div
                    ref={myCursorRef}
                    className="pointer-events-none absolute z-50 transition-none"
                    style={{
                        transform: 'translate(-2px, -2px)',
                        display: 'none' // 초기에는 숨김, updateCursorGuides에서 표시
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.4))' }}>
                        <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
                    </svg>
                    <div className="ml-3 px-1.5 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap bg-blue-600 shadow-md">나</div>
                </div>
            )}
        </>
    );
}
