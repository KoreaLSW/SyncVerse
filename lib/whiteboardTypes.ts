export type Tool = 'pen' | 'eraser' | 'line' | 'rect' | 'circle' | 'arrow' | 'text';

export interface RemoteUser {
    clientId: number;
    pos: { x: number; y: number };
    color: string;
    name: string;
    tool: Tool;
}

export interface DrawPath {
    tool: Tool;
    color: string;
    lineWidth: number;
    points?: { x: number; y: number }[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    text?: string;
}

export interface InProgressStroke {
    clientId: number;
    tool: Tool;
    color: string;
    lineWidth: number;
    points?: { x: number; y: number }[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
}

export const WORLD_WIDTH = 3000;
export const WORLD_HEIGHT = 2000;
export const RECOMMENDED_COLORS = [
    '#000000', '#ffffff', '#ff4d4d', '#007aff', 
    '#4cd964', '#ffcc00', '#ff9500', '#af52de'
];
