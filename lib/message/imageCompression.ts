type CompressionOptions = {
    maxLongEdge?: number;
    targetMaxBytes?: number;
};

const DEFAULT_MAX_LONG_EDGE = 1600;
const DEFAULT_TARGET_MAX_BYTES = 2 * 1024 * 1024;

function isBrowser() {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function createImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('이미지를 불러오지 못했습니다.'));
        };
        img.src = objectUrl;
    });
}

function clampScale(width: number, height: number, maxLongEdge: number) {
    const longEdge = Math.max(width, height);
    if (longEdge <= maxLongEdge) return 1;
    return maxLongEdge / longEdge;
}

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality?: number,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('이미지 압축에 실패했습니다.'));
                    return;
                }
                resolve(blob);
            },
            type,
            quality,
        );
    });
}

export async function compressImageForUpload(
    file: File,
    options?: CompressionOptions,
): Promise<File> {
    if (!isBrowser()) return file;
    if (!file.type.startsWith('image/')) return file;
    // 애니메이션 GIF는 캔버스 압축 시 첫 프레임만 남으므로 원본 유지
    if (file.type === 'image/gif') return file;

    const maxLongEdge = options?.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE;
    const targetMaxBytes = options?.targetMaxBytes ?? DEFAULT_TARGET_MAX_BYTES;

    const image = await createImageFromFile(file);
    const scale = clampScale(image.naturalWidth, image.naturalHeight, maxLongEdge);
    const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale));
    const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    // 우선 webp로 시도하고, 미지원 환경이면 jpeg로 폴백
    const outputType = 'image/webp';
    const qualitySteps = [0.82, 0.76, 0.68, 0.6];

    let bestBlob: Blob | null = null;
    for (const quality of qualitySteps) {
        const blob = await canvasToBlob(canvas, outputType, quality);
        bestBlob = blob;
        if (blob.size <= targetMaxBytes) break;
    }

    if (!bestBlob) return file;
    if (bestBlob.size >= file.size) return file;

    const compressedName = file.name.replace(/\.[^.]+$/, '.webp');
    return new File([bestBlob], compressedName, {
        type: outputType,
        lastModified: Date.now(),
    });
}
