'use client';

import { useYjs } from '../hooks/useYjs';

interface YjsClientProps {
    docName: string;
}

export function YjsClient({ docName }: YjsClientProps) {
    const yjsState = useYjs(docName);

    // Yjs 관련 UI 로직
    return <div>{/* Yjs를 사용하는 UI */}</div>;
}
