'use client';

import { memo, useEffect, useState, useRef } from 'react';
import type { Player } from '@/app/lib/types';
import {
    getCharacterImagePath,
    getSpriteBackgroundPosition,
} from '@/app/lib/playerUtils';

interface CharacterProps {
    player: Player;
    isMe?: boolean; // 내 캐릭터인지 여부
    size?: number; // 캐릭터 크기 (픽셀)
    nickname?: string;
}

export const Character = memo(
    function Character({
        player,
        isMe = false,
        size = 64, // 기본 크기 64x64
        nickname,
    }: CharacterProps) {
        const { head, body } = getCharacterImagePath(
            player.headColor,
            player.bodyColor
        );
        const displayNickname = nickname || player.userId.slice(0, 8);

        const direction = player.direction || 'down';
        const isMoving = !!player.isMoving; // 키 입력 기반: 키를 누르고 있을 때만 true
        // 걷는 모션 애니메이션 상태
        const [frameIndex, setFrameIndex] = useState(0);
        const prevDirectionRef = useRef(direction);
        const animationFrameRef = useRef<number | null>(null);
        const lastFrameTimeRef = useRef<number>(0);
        const frameIndexRef = useRef(0); // 프레임 인덱스를 ref로도 관리 (리셋 방지)

        console.log('Characterzzz');

        // 방향 변경 시 프레임 리셋 (움직이지 않을 때만)
        useEffect(() => {
            if (prevDirectionRef.current !== direction) {
                // 정지 상태일 때만 프레임 리셋
                if (!isMoving) {
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setFrameIndex(0);
                    frameIndexRef.current = 0;
                }
                // 움직이는 중이면 프레임은 계속 유지 (자연스러운 전환)
                prevDirectionRef.current = direction;
            }
        }, [direction, isMoving]);

        // 걷는 모션 애니메이션
        useEffect(() => {
            if (!isMoving) {
                // 정지 상태: 항상 첫 번째 프레임(0번)으로 고정
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setFrameIndex(0);
                frameIndexRef.current = 0;
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                    animationFrameRef.current = null;
                }
                return;
            }

            // 걷는 모션: 프레임 순환 (0, 1, 2, 3, 0, 1, 2, 3...)
            const ANIMATION_SPEED = 100; // 프레임 변경 속도 (ms)
            const MAX_FRAMES = 8; // 걷는 모션 프레임 수

            const animate = (currentTime: number) => {
                if (currentTime - lastFrameTimeRef.current >= ANIMATION_SPEED) {
                    // 프레임 인덱스를 ref로 관리하여 연속성 유지
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

        // 스프라이트 위치 계산 (정지 상태에서는 항상 프레임 0)
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
                className={`absolute transition-transform duration-75 ease-linear ${
                    isMe ? 'z-10' : 'z-0'
                }`}
                style={{
                    left: `${player.x}px`,
                    top: `${player.y}px`,
                    transform: 'translate(-50%, -50%)', // 중심점 기준으로 위치 조정
                }}
            >
                {/* 캐릭터 컨테이너 */}
                <div
                    className='relative'
                    style={{ width: `${size}px`, height: `${size}px` }}
                >
                    {/* 몸체 (뒤에 렌더링) - 스프라이트 시트 사용 */}
                    <div
                        className='absolute inset-0'
                        style={{
                            backgroundImage: `url(${body})`,
                            backgroundPosition: bodyBgPosition,
                            backgroundSize: 'auto',
                            imageRendering: 'pixelated', // 픽셀 아트 스타일 유지
                        }}
                    />

                    {/* 머리 (앞에 렌더링) - 스프라이트 시트 사용 */}
                    <div
                        className='absolute inset-0'
                        style={{
                            backgroundImage: `url(${head})`,
                            backgroundPosition: headBgPosition,
                            backgroundSize: 'auto',
                            imageRendering: 'pixelated', // 픽셀 아트 스타일 유지
                        }}
                    />
                </div>

                {/* 내 캐릭터 표시 (선택사항) */}
                {isMe && (
                    <div className='absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full'>
                        <div className='bg-blue-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap'>
                            나
                        </div>
                    </div>
                )}

                {/* 유저 ID 표시 (디버깅용, 선택사항) */}
                {process.env.NODE_ENV === 'development' && (
                    <div className='absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs text-gray-600 bg-white/80 px-1 rounded'>
                        {displayNickname}
                    </div>
                )}
            </div>
        );
    },
    (prevProps, nextProps) => {
        // 디버깅: 어떤 값이 변경되었는지 확인
        const changed: string[] = [];

        if (prevProps.player.x !== nextProps.player.x) changed.push('x');
        if (prevProps.player.y !== nextProps.player.y) changed.push('y');
        if (prevProps.player.direction !== nextProps.player.direction)
            changed.push('direction');
        if (prevProps.player.isMoving !== nextProps.player.isMoving)
            changed.push('isMoving');
        if (prevProps.player.headColor !== nextProps.player.headColor)
            changed.push('headColor');
        if (prevProps.player.bodyColor !== nextProps.player.bodyColor)
            changed.push('bodyColor');
        if (prevProps.player.userId !== nextProps.player.userId)
            changed.push('userId'); // 추가
        if (prevProps.player.id !== nextProps.player.id) changed.push('id'); // 추가
        if (prevProps.isMe !== nextProps.isMe) changed.push('isMe');
        if (prevProps.size !== nextProps.size) changed.push('size'); // 추가
        if ((prevProps.nickname ?? '') !== (nextProps.nickname ?? ''))
            changed.push('nickname');
        if ((prevProps.player.email ?? '') !== (nextProps.player.email ?? ''))
            changed.push('email');

        if (changed.length > 0) {
            console.log(
                `[Character ${nextProps.player.userId.slice(0, 5)}] Changed:`,
                changed
            );
        }

        // 이전 값과 다음 값을 비교하여 변경된 경우에만 리렌더링
        return (
            prevProps.player.x === nextProps.player.x &&
            prevProps.player.y === nextProps.player.y &&
            prevProps.player.direction === nextProps.player.direction &&
            prevProps.player.isMoving === nextProps.player.isMoving &&
            prevProps.player.headColor === nextProps.player.headColor &&
            prevProps.player.bodyColor === nextProps.player.bodyColor &&
            prevProps.player.userId === nextProps.player.userId && // 추가
            prevProps.player.id === nextProps.player.id && // 추가
            prevProps.isMe === nextProps.isMe &&
            prevProps.size === nextProps.size && // 추가
            (prevProps.nickname ?? '') === (nextProps.nickname ?? '') &&
            (prevProps.player.email ?? '') === (nextProps.player.email ?? '') // 타입 캐스팅 제거
        );
    }
);
