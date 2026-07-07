export function asObject(data: unknown): Record<string, any> {
    return data && typeof data === 'object' ? (data as any) : {};
}
