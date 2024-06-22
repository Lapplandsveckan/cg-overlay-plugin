export function getStylesProxy(styles: Record<string, string>) {
    return new Proxy(styles, {
        get: (target: Record<string, string>, prop: string) => `.${target[prop]}`,
    });
}

export type Styles = Record<string, string>;