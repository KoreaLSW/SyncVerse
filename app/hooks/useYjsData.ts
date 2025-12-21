'use client';

import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { getPlayersMap } from '@/app/lib/playerUtils';
import type { PlayerData } from '@/app/lib/types';

export function useYjsData(ydoc: Y.Doc | null) {
    const [playersMap, setPlayersMap] = useState<Y.Map<PlayerData> | null>(
        null
    );

    useEffect(() => {
        if (!ydoc) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPlayersMap(null);
            return;
        }
        // players Map 가져오기 (없으면 자동 생성됨)
        const map = getPlayersMap(ydoc);
        setPlayersMap(map);

        // 변경 감지 리스너 (선택사항 - 필요시 사용)
        const handleChange = () => {
            // Map이 변경될 때마다 호출됨
            // 필요시 상태 업데이트 로직 추가
        };

        map.observe(handleChange);

        return () => {
            map.unobserve(handleChange);
        };
    }, [ydoc]);

    return { playersMap };
}
