import { Method, type BroadcastTopic, type MediaDoc } from '@web-lib';

// `@web-lib`'s own `topic()` factory is a real runtime export (part of the
// `WebLib` global), but it isn't declared in the shipped `web-lib/index.d.ts`
// — this local re-implementation exists only to get a typed `BroadcastTopic`
// without hand-writing `isValid` everywhere, and defaults it to always-true.
export function topic<T>(
    path: string,
    method: Method,
    isValid?: (data: unknown) => data is T,
): BroadcastTopic<T> {
    return { path, method, isValid: isValid ?? ((_d): _d is T => true) };
}

// Shared by every hook/component that watches the CasparCG media list, since
// the host no longer emits a `caspar.on('media', ...)` event — this is the
// broadcast that replaced it.
export const casparMediaTopic = topic<{ key: string; value: MediaDoc | null }>(
    'caspar/media',
    Method.ACTION,
    (data): data is { key: string; value: MediaDoc | null } =>
        typeof (data as any)?.key === 'string',
);

export const videosTopic = topic<unknown>(
    'plugin/lappis/videos',
    Method.UPDATE,
);
