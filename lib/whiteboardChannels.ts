export type WhiteboardChannel = {
    id: string;
    name: string;
};

export const WHITEBOARD_CHANNELS: WhiteboardChannel[] = [
    { id: 'channel-1', name: '채널 1' },
    { id: 'channel-2', name: '채널 2' },
    { id: 'channel-3', name: '채널 3' },
    { id: 'channel-4', name: '채널 4' },
    { id: 'channel-5', name: '채널 5' },
];

export const MAX_USERS_PER_CHANNEL = 5;

export const getWhiteboardDocName = (channelId: string) =>
    `whiteboard-${channelId}`;

export const isValidWhiteboardChannel = (channelId: string) =>
    WHITEBOARD_CHANNELS.some((channel) => channel.id === channelId);
