import React from 'react';
import { Tool } from '@/lib/whiteboardTypes';

interface WhiteboardCursorGuidesProps {
    tool: Tool;
    isMouseOver: boolean;
    isPanning: boolean;
    lineWidth: number;
    scale: number;
    color: string;
    penGuideRef: React.RefObject<HTMLDivElement | null>;
    eraserGuideRef: React.RefObject<HTMLDivElement | null>;
}

export function WhiteboardCursorGuides({
    tool, isMouseOver, isPanning, lineWidth, scale, color, penGuideRef, eraserGuideRef
}: WhiteboardCursorGuidesProps) {
    if (!isMouseOver || isPanning) return null;

    return (
        <>
            {tool === 'pen' && (
                <div 
                    ref={penGuideRef}
                    className="pointer-events-none absolute border border-white/30 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.3)]"
                    style={{
                        width: lineWidth * scale,
                        height: lineWidth * scale,
                        backgroundColor: color + '22',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 5,
                        display: 'none'
                    }}
                />
            )}
            {tool === 'eraser' && (
                <div 
                    ref={eraserGuideRef}
                    className="pointer-events-none absolute border border-white bg-white/10 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
                    style={{
                        width: lineWidth * scale,
                        height: lineWidth * scale,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 5,
                        display: 'none'
                    }}
                />
            )}
        </>
    );
}
