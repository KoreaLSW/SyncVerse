import { useState, useEffect, useMemo } from 'react';
import { useYjs } from './useYjs';
import { useAuthStore } from '@/stores/authStore';
import { useUsers } from './useUsers';
import { RemoteUser, DrawPath, InProgressStroke } from '@/lib/whiteboardTypes';

export function useWhiteboardSync(docName: string = 'whiteboard-room') {
    const { user } = useAuthStore();
    const { getNickname } = useUsers();
    const yjsState = useYjs(docName);
    const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
    const [remoteStrokes, setRemoteStrokes] = useState<InProgressStroke[]>([]);

    const displayNickname = useMemo(() => {
        if (!user) return '익명';
        if (user.authType === 'google' && user.email) {
            return getNickname(user.email) || user.nickname || user.name || '익명';
        }
        return user.userId.slice(0, 8);
    }, [user, getNickname]);

    useEffect(() => {
        if (!yjsState?.awareness) return;

        const handleAwarenessChange = ({ added, updated, removed }: any) => {
            const isRemoteChange = [...added, ...updated, ...removed].some(
                id => id !== yjsState.ydoc.clientID
            );
            if (!isRemoteChange) return;

            const states = yjsState.awareness.getStates();
            const users: RemoteUser[] = [];
            const strokes: InProgressStroke[] = [];
            states.forEach((state: any, clientId: number) => {
                if (clientId === yjsState.ydoc.clientID) return;
                if (state.user) {
                    users.push({ clientId, ...state.user });
                }
                if (state.user?.inProgress) {
                    strokes.push({ clientId, ...state.user.inProgress });
                }
            });
            setRemoteUsers(users);
            setRemoteStrokes(strokes);
        };

        yjsState.awareness.on('change', handleAwarenessChange);
        return () => yjsState.awareness.off('change', handleAwarenessChange);
    }, [yjsState]);

    const addPath = (path: DrawPath) => {
        if (!yjsState?.ydoc) return;
        const sharedPaths = yjsState.ydoc.getArray<DrawPath>('paths');
        sharedPaths.push([path]);
    };

    const clearAllPaths = () => {
        if (!yjsState?.ydoc) return false;
        const sharedPaths = yjsState.ydoc.getArray<DrawPath>('paths');
        sharedPaths.delete(0, sharedPaths.length);
        return true;
    };

    type AwarenessUserPayload = Partial<Omit<RemoteUser, 'clientId' | 'name'>> & {
        inProgress?: Omit<InProgressStroke, 'clientId'> | null;
    };

    const updateMyAwareness = (data: AwarenessUserPayload) => {
        if (!yjsState?.awareness) return;
        yjsState.awareness.setLocalStateField('user', {
            name: displayNickname,
            ...yjsState.awareness.getLocalState()?.user,
            ...data
        });
    };

    return {
        yjsState,
        remoteUsers,
        remoteStrokes,
        displayNickname,
        addPath,
        clearAllPaths,
        updateMyAwareness
    };
}
