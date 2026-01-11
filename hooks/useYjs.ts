'use client';

import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { getOrCreateUserId } from '@/lib/playerUtils';

type UseYjsResult = {
    ydoc: Y.Doc;
    provider: HocuspocusProvider;
    awareness: HocuspocusProvider['awareness'];
} | null;

export function useYjs(docName: string): UseYjsResult {
    const [state, setState] = useState<UseYjsResult>(null);

    useEffect(() => {
        const ydoc = new Y.Doc();
        const userId = getOrCreateUserId();

        const provider = new HocuspocusProvider({
            url: 'ws://localhost:4001',
            name: docName,
            document: ydoc,
            token: userId, // 서버 onAuthenticate에서 user.id로 사용됨
        });

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({
            ydoc,
            provider,
            awareness: provider.awareness,
        });

        return () => {
            provider.destroy();
            ydoc.destroy();
        };
    }, [docName]);

    return state;
}
