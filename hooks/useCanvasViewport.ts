import { useState, useRef, useEffect, useCallback } from 'react';
import { WORLD_WIDTH, WORLD_HEIGHT } from '@/lib/whiteboardTypes';

export function useCanvasViewport() {
    const [scale, setScale] = useState(1);
    const [baseScale, setBaseScale] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const lastPanPosRef = useRef({ x: 0, y: 0 });

    // 초기 화면 맞춤 설정
    const handleInitialFit = useCallback(() => {
        const padding = 60;
        const availableWidth = window.innerWidth - padding;
        const availableHeight = window.innerHeight - padding - 80;

        const fitScale = Math.min(availableWidth / WORLD_WIDTH, availableHeight / WORLD_HEIGHT);
        
        setScale(fitScale);
        setBaseScale(fitScale);
        
        setOffset({
            x: (window.innerWidth - WORLD_WIDTH * fitScale) / 2,
            y: (window.innerHeight - WORLD_HEIGHT * fitScale) / 2 + 40
        });
    }, []);

    useEffect(() => {
        handleInitialFit();
        window.addEventListener('resize', handleInitialFit);
        return () => window.removeEventListener('resize', handleInitialFit);
    }, [handleInitialFit]);

    const startPanning = (clientX: number, clientY: number) => {
        setIsPanning(true);
        lastPanPosRef.current = { x: clientX, y: clientY };
    };

    const updatePanning = (clientX: number, clientY: number) => {
        if (!isPanning) return;
        const dx = clientX - lastPanPosRef.current.x;
        const dy = clientY - lastPanPosRef.current.y;
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPanPosRef.current = { x: clientX, y: clientY };
    };

    const stopPanning = () => {
        setIsPanning(false);
    };

    return {
        scale,
        setScale,
        baseScale,
        offset,
        setOffset,
        isPanning,
        startPanning,
        updatePanning,
        stopPanning,
        handleInitialFit
    };
}
