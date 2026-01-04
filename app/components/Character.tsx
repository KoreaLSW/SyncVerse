// Character.tsx
'use client';

import { memo, useEffect, useState, useRef, forwardRef } from 'react';
import type { Player } from '@/app/lib/types';
import {
    getCharacterImagePath,
    getSpriteBackgroundPosition,
} from '@/app/lib/playerUtils';

interface CharacterProps {
    player: Player;
    isMe?: boolean;
    size?: number;
    nickname?: string;
}

export const Character = memo(
    forwardRef<HTMLDivElement, CharacterProps>(function Character(
        { player, isMe = false, size = 64, nickname },
        ref
    ) {
        // 🚀 이제 이 로그는 좌표가 바뀔 때나 애니메이션 프레임이 바뀔 때도 찍히지 않습니다.
        // 오직 방향 전환, 이동 시작/정지, 색상 변경 시에만 딱 1번 찍힙니다.
        console.log(
            `[Character] Render ${isMe ? '(나)' : '(타인)'}: ${player.id}`
        );

        const { head, body } = getCharacterImagePath(
            player.headColor,
            player.bodyColor
        );
        const displayNickname = nickname || player.userId.slice(0, 8);
        const direction = player.direction || 'down';
        const isMoving = !!player.isMoving;

        // 🚀 DOM 직접 조작을 위한 Ref들
        const headRef = useRef<HTMLDivElement>(null);
        const bodyRef = useRef<HTMLDivElement>(null);
        const lastFrameTimeRef = useRef<number>(0);
        const frameIndexRef = useRef<number>(0);

        // 걷는 모션 애니메이션 (DOM 직접 조작)
        useEffect(() => {
            if (!isMoving) {
                // 정지 시 0번 프레임으로 초기화
                const bgPos = getSpriteBackgroundPosition(direction, 0);
                if (headRef.current)
                    headRef.current.style.backgroundPosition = bgPos;
                if (bodyRef.current)
                    bodyRef.current.style.backgroundPosition = bgPos;
                return;
            }

            const ANIMATION_SPEED = 100; // 0.1초
            const MAX_FRAMES = 8;
            let animationFrameId: number;

            const animate = (currentTime: number) => {
                if (currentTime - lastFrameTimeRef.current >= ANIMATION_SPEED) {
                    // 🚀 상태(State)를 바꾸지 않고 Ref와 DOM을 직접 수정!
                    frameIndexRef.current =
                        (frameIndexRef.current + 1) % MAX_FRAMES;
                    const bgPos = getSpriteBackgroundPosition(
                        direction,
                        frameIndexRef.current
                    );

                    if (headRef.current)
                        headRef.current.style.backgroundPosition = bgPos;
                    if (bodyRef.current)
                        bodyRef.current.style.backgroundPosition = bgPos;

                    lastFrameTimeRef.current = currentTime;
                }
                animationFrameId = requestAnimationFrame(animate);
            };

            lastFrameTimeRef.current = performance.now();
            animationFrameId = requestAnimationFrame(animate);

            return () => cancelAnimationFrame(animationFrameId);
        }, [isMoving, direction]); // 방향이 바뀌거나 이동 상태가 바뀔 때만 효과 재설정

        // 초기 배경 위치 계산
        const initialBgPos = getSpriteBackgroundPosition(direction, 0);

        return (
            <div
                ref={ref}
                className={`absolute ${isMe ? 'z-10' : 'z-0'}`}
                style={{
                    // 초기 위치만 설정 (부모의 RAF가 덮어씀)
                    transform: `translate3d(${player.x}px, ${player.y}px, 0) translate(-50%, -50%)`,
                    willChange: 'transform',
                }}
            >
                <div
                    className='relative'
                    style={{ width: `${size}px`, height: `${size}px` }}
                >
                    <div
                        ref={bodyRef}
                        className='absolute inset-0'
                        style={{
                            backgroundImage: `url(${body})`,
                            backgroundPosition: initialBgPos,
                            backgroundSize: 'auto',
                            imageRendering: 'pixelated',
                        }}
                    />
                    <div
                        ref={headRef}
                        className='absolute inset-0'
                        style={{
                            backgroundImage: `url(${head})`,
                            backgroundPosition: initialBgPos,
                            backgroundSize: 'auto',
                            imageRendering: 'pixelated',
                        }}
                    />
                </div>

                {/* 닉네임 표시 */}
                <div className='absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center gap-1'>
                    {isMe && (
                        <div className='bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm'>
                            나
                        </div>
                    )}
                    <div className='bg-black/60 text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap backdrop-blur-sm border border-white/10'>
                        {displayNickname}
                    </div>
                </div>
            </div>
        );
    }),
    // 🚀 좌표(x, y)를 비교에서 완전히 제외 (부모의 RAF가 직접 DOM 업데이트)
    (prevProps, nextProps) => {
        const p = prevProps.player;
        const n = nextProps.player;

        return (
            p.direction === n.direction &&
            p.isMoving === n.isMoving &&
            p.headColor === n.headColor &&
            p.bodyColor === n.bodyColor &&
            p.userId === n.userId &&
            p.id === n.id &&
            prevProps.isMe === nextProps.isMe &&
            prevProps.size === nextProps.size &&
            (prevProps.nickname || '') === (nextProps.nickname || '') &&
            (p.email || '') === (n.email || '')
            // x, y는 비교하지 않음!
        );
    }
);
