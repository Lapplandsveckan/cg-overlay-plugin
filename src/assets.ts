import path from 'path';
import fs from 'fs';
import { noTryAsync } from 'no-try';
import type { Logger } from '@lappis/cg-manager';

// SVG viewBox mirrors the 16:9 aspect ratio.
// Bubble position mirrors BubbleWatermark.module.css:
//   width:18vw, right:3vw, bottom:3vh  →  in 16:9 units:
//   w=h=2.88, x=12.64, y=5.85
// feColorMatrix replicates CSS brightness(0) invert(1) → white, alpha preserved.
export function buildBackgroundData(dir: string): {
    data: string;
    mimeType: string;
} {
    const bubbleB64 = fs
        .readFileSync(path.join(dir, 'templates', 'images', 'bubble.png'))
        .toString('base64');
    const data = Buffer.from(
        [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9" width="1600" height="900">',
            '<rect width="16" height="9" fill="#f87a00"/>',
            '<defs><filter id="w">',
            '<feColorMatrix type="matrix"',
            ' values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/>',
            '</filter></defs>',
            `<image href="data:image/png;base64,${bubbleB64}"`,
            ' filter="url(#w)" opacity="0.4"',
            ' x="12.64" y="5.85" width="2.88" height="2.88"/>',
            '</svg>',
        ].join(''),
    ).toString('base64');
    return { data, mimeType: 'image/svg+xml' };
}

const MIME_MAP: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

export async function readImageData(
    filePath: string,
    logger?: Logger,
): Promise<{ data: string; mimeType: string } | null> {
    const [err, buf] = await noTryAsync(() => fs.promises.readFile(filePath));
    if (err || !buf) {
        if (err)
            logger?.error(
                `Failed to read image file "${filePath}": ${(err as any).message}`,
            );
        return null;
    }
    const mimeType =
        MIME_MAP[path.extname(filePath).toLowerCase()] ??
        'application/octet-stream';
    return { data: buf.toString('base64'), mimeType };
}
