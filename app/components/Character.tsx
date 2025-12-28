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
        const { head, body } = getCharacterImagePath(
            player.headColor,
            player.bodyColor
        );
        const displayNickname = nickname || player.userId.slice(0, 8);

        const direction = player.direction || 'down';
        const isMoving = !!player.isMoving;

        // 걷는 모션 애니메이션 상태
        const [frameIndex, setFrameIndex] = useState(0);
        const prevDirectionRef = useRef(direction);
        const animationFrameRef = useRef<number | null>(null);
        const lastFrameTimeRef = useRef<number>(0);
        const frameIndexRef = useRef(0);

        // 🚀 좌표는 부모의 RAF가 직접 DOM으로 업데이트하므로 여기서는 제거됨
        // 초기 transform만 설정 (부모가 덮어씀)

        // 방향 변경 시 프레임 리셋
        useEffect(() => {
            if (prevDirectionRef.current !== direction) {
                if (!isMoving) {
                    setFrameIndex(0);
                    frameIndexRef.current = 0;
                }
                prevDirectionRef.current = direction;
            }
        }, [direction, isMoving]);

        // 걷는 모션 애니메이션
        useEffect(() => {
            if (!isMoving) {
                setFrameIndex(0);
                frameIndexRef.current = 0;
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                return;
            }

            const ANIMATION_SPEED = 100;
            const MAX_FRAMES = 8;

            const animate = (currentTime: number) => {
                if (currentTime - lastFrameTimeRef.current >= ANIMATION_SPEED) {
                    frameIndexRef.current =
                        (frameIndexRef.current + 1) % MAX_FRAMES;
                    setFrameIndex(frameIndexRef.current);
                    lastFrameTimeRef.current = currentTime;
                }
                animationFrameRef.current = requestAnimationFrame(animate);
            };

            lastFrameTimeRef.current = performance.now();
            animationFrameRef.current = requestAnimationFrame(animate);

            return () => {
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
            };
        }, [isMoving]);

        // 스프라이트 위치 계산
        const currentFrameIndex = isMoving ? frameIndex : 0;
        const headBgPosition = getSpriteBackgroundPosition(
            direction,
            currentFrameIndex
        );
        const bodyBgPosition = getSpriteBackgroundPosition(
            direction,
            currentFrameIndex
        );

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
                        className='absolute inset-0'
                        style={{
                            backgroundImage: `url(${body})`,
                            backgroundPosition: bodyBgPosition,
                            backgroundSize: 'auto',
                            imageRendering: 'pixelated',
                        }}
                    />
                    <div
                        className='absolute inset-0'
                        style={{
                            backgroundImage: `url(${head})`,
                            backgroundPosition: headBgPosition,
                            backgroundSize: 'auto',
                            imageRendering: 'pixelated',
                        }}
                    />
                </div>

                {isMe && (
                    <div className='absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full'>
                        <div className='bg-blue-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap'>
                            나
                        </div>
                    </div>
                )}

                {process.env.NODE_ENV === 'development' && (
                    <div className='absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs text-gray-600 bg-white/80 px-1 rounded'>
                        {displayNickname}
                    </div>
                )}
            </div>
        );
    }),
    // 🚀 좌표(x, y)를 비교에서 완전히 제외 (부모의 RAF가 직접 DOM 업데이트)
    (prevProps, nextProps) => {
        return (
            prevProps.player.direction === nextProps.player.direction &&
            prevProps.player.isMoving === nextProps.player.isMoving &&
            prevProps.player.headColor === nextProps.player.headColor &&
            prevProps.player.bodyColor === nextProps.player.bodyColor &&
            prevProps.player.userId === nextProps.player.userId &&
            prevProps.player.id === nextProps.player.id &&
            prevProps.isMe === nextProps.isMe &&
            prevProps.size === nextProps.size &&
            (prevProps.nickname ?? '') === (nextProps.nickname ?? '') &&
            (prevProps.player.email ?? '') === (nextProps.player.email ?? '')
            // x, y는 비교하지 않음!
        );
    }
);
