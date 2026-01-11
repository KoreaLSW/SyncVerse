// app/hooks/useLocationTrigger.ts
import { useEffect, useRef, useState } from 'react';

export interface Zone {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    imagePath: string;
    pagePath: string;
    onEnter?: () => void;
    onExit?: () => void;
}

export function useLocationTrigger(
    playerX: number,
    playerY: number,
    zones: Zone[]
) {
    const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
    const activeZonesRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        let currentActiveZone: string | null = null;

        zones.forEach((zone) => {
            const isInside =
                playerX >= zone.x &&
                playerX <= zone.x + zone.width &&
                playerY >= zone.y &&
                playerY <= zone.y + zone.height;

            const wasInside = activeZonesRef.current.has(zone.id);

            if (isInside) {
                currentActiveZone = zone.id;
                if (!wasInside) {
                    // 🚀 구역 진입
                    activeZonesRef.current.add(zone.id);
                    zone.onEnter?.();
                    console.log(`Entered: ${zone.label}`);
                }
            } else if (wasInside) {
                // 🚀 구역 나감
                activeZonesRef.current.delete(zone.id);
                zone.onExit?.();
                console.log(`Exited: ${zone.label}`);
            }
        });

        setActiveZoneId(currentActiveZone);
    }, [playerX, playerY, zones]);

    return activeZoneId;
}
