// syncverse/app/components/MapObject.tsx
'use client';

interface MapObjectProps {
    x: number;
    y: number;
    width: number;
    height: number;
    imagePath: string;
    zIndex?: number;
    className?: string;
}

export function MapObject({
    x,
    y,
    width,
    height,
    imagePath,
    zIndex = 1,
    className = '',
}: MapObjectProps) {
    return (
        <div
            className={className}
            style={{
                position: 'absolute',
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
                backgroundImage: `url(${imagePath})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                pointerEvents: 'none',
                zIndex: zIndex,
            }}
        />
    );
}

