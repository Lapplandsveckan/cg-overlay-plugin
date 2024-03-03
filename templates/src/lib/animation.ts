export function getStylesProxy(styles: Record<string, string>) {
    return new Proxy(styles, {
        get(target: Record<string, string>, prop: string) {
            return '.' + target[prop];
        },
    });
}