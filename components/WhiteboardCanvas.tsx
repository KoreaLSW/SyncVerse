'use client';

import { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react';
import { Tool, DrawPath, WORLD_WIDTH, WORLD_HEIGHT } from '@/lib/whiteboardTypes';
import { useWhiteboardSync } from '@/hooks/useWhiteboardSync';
import { useCanvasViewport } from '@/hooks/useCanvasViewport';
import { WhiteboardToolbar } from './WhiteboardToolbar';
import { RemoteCursors } from './RemoteCursors';
import { WhiteboardCursorGuides } from './WhiteboardCursorGuides';
import { WhiteboardTextInput } from './WhiteboardTextInput';
import { getWhiteboardDocName } from '@/lib/whiteboardChannels';

type WhiteboardCanvasProps = {
    channelId: string;
};

export const WhiteboardCanvas = memo(function WhiteboardCanvas({
    channelId,
}: WhiteboardCanvasProps) {
    // 1. Hooks & Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null); // 🚀 로컬 프리뷰 캔버스
    const remotePreviewCanvasRef = useRef<HTMLCanvasElement>(null); // 🚀 원격 프리뷰 캔버스
    const inputRef = useRef<HTMLInputElement>(null);
    const startPosRef = useRef({ x: 0, y: 0 });
    const currentPathRef = useRef<{ x: number; y: number }[]>([]);
    
    // UI 직접 제어용 Refs
    const cursorPosRef = useRef({ x: 0, y: 0 });
    const penGuideRef = useRef<HTMLDivElement>(null);
    const eraserGuideRef = useRef<HTMLDivElement>(null);
    const myCursorRef = useRef<HTMLDivElement>(null);

    const docName = useMemo(
        () => getWhiteboardDocName(channelId),
        [channelId]
    );

    const { 
        yjsState, remoteUsers, remoteStrokes, displayNickname, addPath, clearAllPaths, updateMyAwareness 
    } = useWhiteboardSync(docName);

    const { 
        scale, setScale, baseScale, offset, setOffset, 
        isPanning, startPanning, updatePanning, stopPanning, handleInitialFit 
    } = useCanvasViewport();

    // 2. States
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('pen');
    const [color, setColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(2);
    const [isMouseOver, setIsMouseOver] = useState(false);
    
    const [isTyping, setIsTyping] = useState(false);
    const [textInputPos, setTextInputPos] = useState({ x: 0, y: 0 });
    const [textValue, setTextValue] = useState('');
    const lastAwarenessUpdateRef = useRef(0);

    // 3. Drawing Logic
    const drawShape = useCallback((ctx: CanvasRenderingContext2D, start: {x: number, y: number}, end: {x: number, y: number}, tool: Tool) => {
        ctx.beginPath();
        switch (tool) {
            case 'line': ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); break;
            case 'rect': ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y); break;
            case 'circle': 
                const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
                ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI); 
                break;
            case 'arrow':
                const headlen = 15;
                const angle = Math.atan2(end.y - start.y, end.x - start.x);
                ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
                ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
                ctx.moveTo(end.x, end.y);
                ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
                break;
        }
        ctx.stroke();
    }, []);

    const renderAll = useCallback(() => {
        if (!yjsState?.ydoc) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const sharedPaths = yjsState.ydoc.getArray<DrawPath>('paths');
        ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        
        sharedPaths.forEach((path) => {
            ctx.beginPath();
            ctx.globalCompositeOperation = path.tool === 'eraser' ? 'destination-out' : 'source-over';
            ctx.strokeStyle = path.color;
            ctx.lineWidth = path.lineWidth;
            ctx.lineCap = path.tool === 'eraser' ? 'square' : 'round';
            ctx.lineJoin = path.tool === 'eraser' ? 'miter' : 'round';

            if (['pen', 'eraser'].includes(path.tool) && path.points) {
                path.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
                ctx.stroke();
            } else if (path.tool === 'text' && path.start && path.text) {
                ctx.fillStyle = path.color;
                const fontSize = 18 + path.lineWidth;
                ctx.font = `${fontSize}px Arial`; ctx.textBaseline = 'top';
                ctx.fillText(path.text, path.start.x, path.start.y);
            } else if (path.start && path.end) {
                drawShape(ctx, path.start, path.end, path.tool);
            }
        });
        ctx.globalCompositeOperation = 'source-over';
    }, [yjsState, drawShape]);

    // 4. Effects
    useEffect(() => {
        if (!yjsState?.ydoc) return;
        const sharedPaths = yjsState.ydoc.getArray<DrawPath>('paths');
        sharedPaths.observe(renderAll);
        renderAll();
        return () => sharedPaths.unobserve(renderAll);
    }, [yjsState, renderAll]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const previewCanvas = previewCanvasRef.current;
        const remotePreviewCanvas = remotePreviewCanvasRef.current;
        if (!canvas || !previewCanvas || !remotePreviewCanvas) return;

        const updateCanvasSize = () => {
            const ctx = canvas.getContext('2d');
            const previewCtx = previewCanvas.getContext('2d');
            const remotePreviewCtx = remotePreviewCanvas.getContext('2d');
            if (!ctx || !previewCtx || !remotePreviewCtx) return;

            const dpr = window.devicePixelRatio || 1;
            
            // 두 캔버스 모두 크기 및 DPI 설정
            [canvas, previewCanvas, remotePreviewCanvas].forEach(c => {
                c.width = WORLD_WIDTH * dpr;
                c.height = WORLD_HEIGHT * dpr;
                c.style.width = `${WORLD_WIDTH}px`;
                c.style.height = `${WORLD_HEIGHT}px`;
            });

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            previewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            previewCtx.lineCap = 'round';
            previewCtx.lineJoin = 'round';

            remotePreviewCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            remotePreviewCtx.lineCap = 'round';
            remotePreviewCtx.lineJoin = 'round';

            renderAll();
        };
        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);
        return () => window.removeEventListener('resize', updateCanvasSize);
    }, [renderAll]);

    useEffect(() => {
        const remotePreviewCanvas = remotePreviewCanvasRef.current;
        const ctx = remotePreviewCanvas?.getContext('2d');
        if (!remotePreviewCanvas || !ctx) return;

        ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        remoteStrokes.forEach((stroke) => {
            ctx.beginPath();
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = stroke.tool === 'eraser' ? 'rgba(255, 255, 255, 0.5)' : stroke.color;
            ctx.lineWidth = stroke.lineWidth;
            ctx.lineCap = stroke.tool === 'eraser' ? 'square' : 'round';
            ctx.lineJoin = stroke.tool === 'eraser' ? 'miter' : 'round';

            if (['pen', 'eraser'].includes(stroke.tool) && stroke.points) {
                stroke.points.forEach((p, i) => {
                    if (i === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.stroke();
            } else if (stroke.start && stroke.end) {
                drawShape(ctx, stroke.start, stroke.end, stroke.tool);
            }
        });
    }, [remoteStrokes, drawShape]);

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -2 : 2;
                setLineWidth((prev) => Math.min(Math.max(prev + delta, 1), 100));
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            stopPanning();
            setIsDrawing(false);
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [stopPanning]);

    // 5. Handlers
    const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        return {
            x: ((clientX - rect.left) * WORLD_WIDTH) / rect.width,
            y: ((clientY - rect.top) * WORLD_HEIGHT) / rect.height
        };
    }, []);

    const updateCursorGuides = useCallback((pos: { x: number; y: number }) => {
        const left = `${pos.x * scale + offset.x}px`;
        const top = `${pos.y * scale + offset.y}px`;
        if (penGuideRef.current) { penGuideRef.current.style.left = left; penGuideRef.current.style.top = top; penGuideRef.current.style.display = 'block'; }
        if (eraserGuideRef.current) { eraserGuideRef.current.style.left = left; eraserGuideRef.current.style.top = top; eraserGuideRef.current.style.display = 'block'; }
        if (myCursorRef.current) { myCursorRef.current.style.left = left; myCursorRef.current.style.top = top; myCursorRef.current.style.display = 'block'; }
    }, [scale, offset]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        const previewCanvas = previewCanvasRef.current;
        const previewCtx = previewCanvas?.getContext('2d');
        if (!canvas || !previewCanvas || !previewCtx) return;

        const pos = getPos(e);
        cursorPosRef.current = pos;
        updateCursorGuides(pos);
        startPosRef.current = pos;
        currentPathRef.current = [pos];
        setIsDrawing(true);

        if (tool === 'eraser') return;

        // 프리뷰 캔버스 설정 초기화
        previewCtx.beginPath();
        previewCtx.moveTo(pos.x, pos.y);
        
        // 펜이면 현재 색상 설정
        previewCtx.strokeStyle = color;
        previewCtx.lineWidth = lineWidth;
        previewCtx.lineCap = 'round';
        previewCtx.lineJoin = 'round';
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getPos(e);
        cursorPosRef.current = pos;
        updateCursorGuides(pos);
        const now = Date.now();
        if (now - lastAwarenessUpdateRef.current > 30) {
            if (!isDrawing) {
                updateMyAwareness({ pos, color, tool, inProgress: null });
            } else {
                const inProgress =
                    tool === 'pen' || tool === 'eraser'
                        ? {
                              tool,
                              color,
                              lineWidth,
                              points: [...currentPathRef.current, pos],
                          }
                        : {
                              tool,
                              color,
                              lineWidth,
                              start: { ...startPosRef.current },
                              end: { ...pos },
                          };
                updateMyAwareness({ pos, color, tool, inProgress });
            }
            lastAwarenessUpdateRef.current = now;
        }

        if (!isDrawing) return;

        if (tool === 'eraser') {
            // 지우개: 메인 캔버스에서 실시간으로 직접 제거
            const mainCtx = canvasRef.current?.getContext('2d');
            if (mainCtx) {
                const lastPos = currentPathRef.current[currentPathRef.current.length - 1];
                mainCtx.save();
                mainCtx.globalCompositeOperation = 'destination-out';
                mainCtx.lineWidth = lineWidth;
                mainCtx.lineCap = 'square';
                mainCtx.lineJoin = 'miter';
                
                mainCtx.beginPath();
                mainCtx.moveTo(lastPos.x, lastPos.y);
                mainCtx.lineTo(pos.x, pos.y);
                mainCtx.stroke();
                mainCtx.restore();
            }
            currentPathRef.current.push(pos);
            return;
        }

        const previewCanvas = previewCanvasRef.current;
        const previewCtx = previewCanvas?.getContext('2d');
        if (!previewCanvas || !previewCtx) return;

        if (tool === 'pen') {
            // 자유 곡선 그리기: 프리뷰 캔버스에 직접 렌더링
            previewCtx.lineTo(pos.x, pos.y);
            previewCtx.stroke();
            currentPathRef.current.push(pos);
        } else {
            // 도형 그리기: 프리뷰 캔버스 클리어 후 새로 그리기
            previewCtx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
            drawShape(previewCtx, startPosRef.current, pos, tool);
        }
    };

    const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        
        const pos = e ? getPos(e) : cursorPosRef.current;
        const newPath: DrawPath = { tool, color, lineWidth };
        
        if (['pen', 'eraser'].includes(tool)) {
            newPath.points = [...currentPathRef.current];
        } else {
            newPath.start = { ...startPosRef.current };
            newPath.end = { ...pos };
        }
        
        addPath(newPath);
        setIsDrawing(false);
        updateMyAwareness({ inProgress: null });

        // 드로잉 종료 후 프리뷰 캔버스 클리어
        const previewCtx = previewCanvasRef.current?.getContext('2d');
        if (previewCtx) {
            previewCtx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1) { startPanning(e.clientX, e.clientY); return; }
        if (tool === 'text') {
            if (isTyping) finalizeText();
            else {
                const pos = getPos(e);
                setTextInputPos(pos); setIsTyping(true); setTextValue('');
                setTimeout(() => inputRef.current?.focus(), 0);
            }
            return;
        }
        startDrawing(e);
    };

    const finalizeText = () => {
        if (!isTyping || !textValue.trim()) { setIsTyping(false); return; }
        addPath({ tool: 'text', color, lineWidth, start: { ...textInputPos }, text: textValue });
        setIsTyping(false); setTextValue('');
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const pos = getPos(e);
        cursorPosRef.current = pos;
        updateCursorGuides(pos);
        if (isPanning) { updatePanning(e.clientX, e.clientY); return; }
        draw(e);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (e.button === 1) { stopPanning(); return; }
        stopDrawing(e);
    };

    console.log('displayNickname', displayNickname);

    return (
        <div className="relative w-full h-screen bg-slate-800 overflow-hidden">
            <WhiteboardToolbar 
                tool={tool} setTool={setTool}
                color={color} setColor={setColor}
                lineWidth={lineWidth} setLineWidth={setLineWidth}
                scale={scale} setScale={setScale}
                baseScale={baseScale}
                onResetView={() => {
                    setScale(baseScale);
                    setOffset({
                        x: (window.innerWidth - WORLD_WIDTH * baseScale) / 2,
                        y: (window.innerHeight - WORLD_HEIGHT * baseScale) / 2 + 40
                    });
                }}
                userCount={remoteUsers.length + 1}
                onClearAll={clearAllPaths}
            />

            <div className="w-full h-full" style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: 'none' }}>
                {/* 메인 캔버스: 확정된 그림들 */}
                <canvas
                    ref={canvasRef}
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        border: '2px solid rgba(255, 255, 255, 0.15)',
                        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                    className="bg-[#1e293b] pointer-events-none"
                />
                {/* 원격 프리뷰 캔버스: 상대방 진행 중 스트로크 */}
                <canvas
                    ref={remotePreviewCanvasRef}
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                    className="pointer-events-none"
                />
                {/* 프리뷰 캔버스: 현재 내가 그리는 중인 그림 (오버레이) */}
                <canvas
                    ref={previewCanvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseOut={() => {
                        setIsMouseOver(false);
                        if (myCursorRef.current) myCursorRef.current.style.display = 'none';
                        if (penGuideRef.current) penGuideRef.current.style.display = 'none';
                        if (eraserGuideRef.current) eraserGuideRef.current.style.display = 'none';
                    }}
                    onMouseEnter={() => setIsMouseOver(true)}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={() => stopDrawing()}
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                    className={`touch-none ${isPanning ? 'cursor-grabbing' : tool === 'eraser' || tool === 'pen' ? 'md:cursor-none' : 'cursor-crosshair'}`}
                />
            </div>

            <RemoteCursors remoteUsers={remoteUsers} scale={scale} offset={offset} myCursorRef={myCursorRef} isMouseOver={isMouseOver} isPanning={isPanning} />
            <WhiteboardCursorGuides tool={tool} isMouseOver={isMouseOver} isPanning={isPanning} lineWidth={lineWidth} scale={scale} color={color} penGuideRef={penGuideRef} eraserGuideRef={eraserGuideRef} />
            
            {isTyping && (
                <WhiteboardTextInput 
                    inputRef={inputRef} textValue={textValue} setTextValue={setTextValue}
                    onFinalize={finalizeText} onCancel={() => setIsTyping(false)}
                    pos={textInputPos} scale={scale} offset={offset} lineWidth={lineWidth} color={color}
                />
            )}
        </div>
    );
});
