// syncverse/app/lib/mapConfig.ts
import { Zone } from '../hooks/useLocationTrigger';

export const TRIGGER_ZONES: Zone[] = [
    {
        id: 'whiteboard',
        x: 200,
        y: 200,
        width: 100,
        height: 100,
        label: '화이트보드',
        imagePath: '/locations/whiteboard.png',
        pagePath: '/whiteboard',
        onEnter: () => {},
        onExit: () => console.log('분수대를 떠났습니다.'),
    },
];
