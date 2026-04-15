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
    {
        id: 'message',
        x: 1200,
        y: 200,
        width: 100,
        height: 100,
        label: '메시지',
        imagePath: '/locations/message.png',
        pagePath: '/message',
        onEnter: () => {},
        onExit: () => {},
    },
    {
        id: 'settings',
        x: 1200,
        y: 1200,
        width: 100,
        height: 100,
        label: '설정',
        imagePath: '/locations/setting.png',
        pagePath: '/settings',
        onEnter: () => {},
        onExit: () => {},
    },
];
