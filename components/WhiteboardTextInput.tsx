import React from 'react';

interface WhiteboardTextInputProps {
    inputRef: React.RefObject<HTMLInputElement | null>;
    textValue: string;
    setTextValue: (value: string) => void;
    onFinalize: () => void;
    onCancel: () => void;
    pos: { x: number; y: number };
    scale: number;
    offset: { x: number; y: number };
    lineWidth: number;
    color: string;
}

export function WhiteboardTextInput({
    inputRef, textValue, setTextValue, onFinalize, onCancel, pos, scale, offset, lineWidth, color
}: WhiteboardTextInputProps) {
    return (
        <input
            ref={inputRef}
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') onFinalize();
                if (e.key === 'Escape') onCancel();
            }}
            onBlur={onFinalize}
            className="absolute bg-transparent border border-blue-500 outline-none text-white p-1"
            style={{
                left: pos.x * scale + offset.x,
                top: pos.y * scale + offset.y,
                fontSize: `${(18 + lineWidth) * scale}px`,
                color: color,
                minWidth: '100px',
                zIndex: 10,
                transformOrigin: 'top left',
            }}
        />
    );
}
