import React from 'react';
import { Tool, RECOMMENDED_COLORS } from '@/lib/whiteboardTypes';

interface WhiteboardToolbarProps {
    tool: Tool;
    setTool: (tool: Tool) => void;
    color: string;
    setColor: (color: string) => void;
    lineWidth: number;
    setLineWidth: (width: number) => void;
    scale: number;
    setScale: React.Dispatch<React.SetStateAction<number>>;
    baseScale: number;
    onResetView: () => void;
    userCount: number;
    onClearAll: () => void;
}

export function WhiteboardToolbar({
    tool, setTool,
    color, setColor,
    lineWidth, setLineWidth,
    scale, setScale,
    baseScale, onResetView,
    userCount,
    onClearAll
}: WhiteboardToolbarProps) {
    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/60 p-2.5 rounded-2xl backdrop-blur-lg border border-white/10 shadow-2xl whitespace-nowrap">
            {/* 브러쉬 도구 */}
            <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
                {(['pen', 'eraser'] as Tool[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTool(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tool === t ? 'bg-blue-500 text-white' : 'hover:bg-white/10 text-gray-300'}`}
                    >
                        {t === 'pen' ? '펜' : '지우개'}
                    </button>
                ))}
            </div>

            {/* 도형 도구 */}
            <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
                {(['line', 'rect', 'circle', 'arrow'] as Tool[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTool(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tool === t ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-gray-300'}`}
                    >
                        {t === 'line' ? '━' : t === 'rect' ? '⬜' : t === 'circle' ? '⭕' : '↗'}
                    </button>
                ))}
                <button
                    onClick={() => setTool('text')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tool === 'text' ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-gray-300'}`}
                >
                    T
                </button>
            </div>

            <div className="h-6 w-[1px] bg-white/20" />

            {/* 색상 팔레트 */}
            <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
                <div className="flex gap-1.5 px-1">
                    {RECOMMENDED_COLORS.map((c) => (
                        <button
                            key={c}
                            onClick={() => {
                                setColor(c);
                                if (tool === 'eraser') setTool('pen');
                            }}
                            disabled={tool === 'eraser'}
                            className={`w-6 h-6 rounded-full border border-white/20 transition-all ${
                                color === c && tool !== 'eraser' 
                                    ? 'ring-2 ring-white scale-125 z-10' 
                                    : 'hover:scale-110'
                            } ${tool === 'eraser' ? 'opacity-30 cursor-not-allowed' : ''}`}
                            style={{ backgroundColor: c }}
                            title={c}
                        />
                    ))}
                </div>
                <div className="h-4 w-[1px] bg-white/20" />
                <div className="relative flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden border border-white/20 hover:bg-white/10 transition-colors">
                    <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => {
                            setColor(e.target.value);
                            if (tool === 'eraser') setTool('pen');
                        }}
                        disabled={tool === 'eraser'}
                        className="absolute w-[150%] h-[150%] cursor-pointer bg-transparent border-none p-0"
                    />
                    <div className="w-4 h-4 rounded-full pointer-events-none border border-white/20" style={{ backgroundColor: color }} />
                </div>
            </div>
            
            <div className="h-6 w-[1px] bg-white/20" />
            
            <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] text-gray-400 whitespace-nowrap">{lineWidth}px</span>
                <input 
                    type="range" 
                    min="1" max="40" 
                    value={lineWidth} 
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
            </div>

            <div className="h-6 w-[1px] bg-white/20" />

            {/* 확대/축소 도구 */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                <button onClick={() => setScale(prev => Math.max(prev - 0.05, 0.05))} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg text-white transition-colors" title="축소">🔍-</button>
                <button onClick={onResetView} className="px-2 text-[10px] text-white font-bold hover:bg-white/20 rounded-lg transition-colors min-w-[45px]" title="전체 화면으로 맞춤">
                    {Math.round((scale / baseScale) * 100)}%
                </button>
                <button onClick={() => setScale(prev => Math.min(prev + 0.05, 5))} className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-lg text-white transition-colors" title="확대">🔍+</button>
            </div>

            <div className="h-6 w-[1px] bg-white/20" />

            {/* 접속자 수 */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl text-xs font-bold text-blue-400">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                접속자: {userCount}명
            </div>

            <button onClick={onClearAll} className="px-3 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition whitespace-nowrap">전체 삭제</button>
        </div>
    );
}
