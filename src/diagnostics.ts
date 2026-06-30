import type { Logger } from '@lappis/cg-manager';

// Narrow interface satisfied by LappisOverlayPlugin without creating a circular import.
export interface PluginRef {
    getLogger(): Logger;
    broadcast(target: string, method: string, data: unknown): void;
}

export interface DiagEvent {
    level: 'error' | 'warn' | 'health';
    scope: string;
    message: string;
    time: number;
}

const RING_SIZE = 50;
const ring: DiagEvent[] = [];

function push(plugin: PluginRef, event: DiagEvent) {
    if (ring.length >= RING_SIZE) ring.shift();
    ring.push(event);
    plugin.broadcast('diagnostics', 'UPDATE', event);
}

export function getEvents(): DiagEvent[] {
    return [...ring];
}

export function getLogger(plugin: PluginRef, scope: string): Logger {
    return plugin.getLogger().scope(scope);
}

export function reportError(
    plugin: PluginRef,
    scope: string,
    message: string,
    err?: unknown,
) {
    const logger = getLogger(plugin, scope);
    logger.error(message);
    if (err instanceof Error) logger.error(err);
    else if (err !== undefined) logger.error(String(err));
    push(plugin, { level: 'error', scope, message, time: Date.now() });
}

export function reportWarn(plugin: PluginRef, scope: string, message: string) {
    getLogger(plugin, scope).warn(message);
    push(plugin, { level: 'warn', scope, message, time: Date.now() });
}

export function reportHealth(
    plugin: PluginRef,
    scope: string,
    message: string,
) {
    getLogger(plugin, scope).warn(message);
    push(plugin, { level: 'health', scope, message, time: Date.now() });
}

// Wrap a fire-and-forget executor.execute() promise; logs errors via the
// provided scoped logger without changing the calling code's promise behavior.
export function execChecked(
    logger: Logger,
    label: string,
    promise: Promise<unknown>,
) {
    promise.catch(err => {
        logger.error(`Failed to ${label}`);
        if (err instanceof Error) logger.error(err);
        else if (err !== undefined) logger.error(String(err));
    });
}
