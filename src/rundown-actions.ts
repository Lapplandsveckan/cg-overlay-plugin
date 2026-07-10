import path from 'path';
import * as fs from 'fs/promises';
import {
    type RundownActionMetadata,
    UI_INJECTION_ZONE,
} from '@lappis/cg-manager';
import { type RundownItem } from '@lappis/cg-manager/dist/types/rundown';
import {
    PPTX_MIME,
    IMPORTS_FOLDER,
    isPdf,
    isPptx,
} from './presentation-import';
import { makePresentationId } from './presentations';
import { reportWarn } from './diagnostics';
import { type LappisOverlayPlugin } from './index';

function stripExt(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? filename : filename.substring(0, lastDot);
}

export function registerRundownActions(plugin: LappisOverlayPlugin) {
    const registerRundownAction = (
        key: string,
        action: (rundown: RundownItem) => void,
        metadata?: RundownActionMetadata,
    ) => {
        plugin
            .getApi()
            .registerUI(
                plugin.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_ITEM, key),
                path.join(__dirname, 'ui', key, 'Item'),
            );
        plugin
            .getApi()
            .registerUI(
                plugin.getInjectionZone(UI_INJECTION_ZONE.RUNDOWN_EDITOR, key),
                path.join(__dirname, 'ui', key, 'Editor'),
            );

        plugin.getApi().registerRundownAction(key, action, metadata);
    };

    registerRundownAction(
        'play-video',
        async rundown => {
            const video = plugin
                .getApi()
                .getFileDatabase()
                .get(rundown.data.clip);
            if (!video) {
                reportWarn(
                    plugin,
                    'route',
                    `play-video: clip "${rundown.data.clip}" not found`,
                );
                return null;
            }

            dispatchVideo(plugin, video.id, rundown.data.options);
        },
        {
            accepts: {
                fileTypes: ['video/*'],
                match: file => {
                    if (!file.type.startsWith('video/')) return null;
                    return {
                        type: 'play-video',
                        title: stripExt(file.name),
                        data: {
                            clip: (file as unknown as { mediaId: string })
                                .mediaId,
                        },
                        immediate: true,
                    };
                },
            },
            stop: () => plugin.video.stopVideo(),
        },
    );

    registerRundownAction(
        'namnskylt',
        async rundown => {
            const name = rundown.data.name;
            if (!name) {
                reportWarn(
                    plugin,
                    'route',
                    'namnskylt rundown action: no name provided',
                );
                return null;
            }

            plugin.overlay.showNamnskylt(name);
        },
        { stop: () => plugin.overlay.hideNamnskylt() },
    );

    registerRundownAction(
        'bars',
        async () => {
            plugin.overlay.toggleBars();
        },
        { stop: () => plugin.overlay.stopBars() },
    );

    registerRundownAction(
        'caption',
        async () => {
            plugin.overlay.toggleCaption();
        },
        { stop: () => plugin.overlay.stopCaption() },
    );

    registerRundownAction(
        'swish',
        async rundown => {
            const { number, labels, highlightIntro, fromBelow } = rundown.data;
            plugin.overlay.toggleSwish(
                number,
                labels,
                highlightIntro,
                fromBelow,
            );
        },
        { stop: () => plugin.overlay.stopSwish() },
    );

    registerRundownAction(
        'insamling',
        async rundown => {
            plugin.overlay.toggleInsamling(rundown.data);
        },
        { stop: () => plugin.overlay.stopInsamling() },
    );

    registerRundownAction(
        'slides',
        async rundown => {
            const presentationId = rundown.data?.presentationId;
            if (typeof presentationId !== 'string' || !presentationId) {
                plugin
                    .getLoggerRef()
                    .warn('slides rundown action: no presentationId on entry');
                return;
            }

            await plugin.presentations.ready;
            if (!plugin.presentations.get(presentationId)) {
                plugin
                    .getLoggerRef()
                    .warn(
                        `slides rundown action: presentation ${presentationId} not found`,
                    );
                return;
            }

            plugin.overlay.broadcastArmEvent(presentationId, rundown.id);
        },
        {
            stop: () => plugin.overlay.stopPlayback(),
            accepts: {
                fileTypes: ['application/pdf', '.pdf', PPTX_MIME, '.pptx'],
                destination: `${IMPORTS_FOLDER}/`,
                match: file => {
                    const accepted =
                        isPdf(file.name) ||
                        isPptx(file.name) ||
                        file.type === 'application/pdf' ||
                        file.type === PPTX_MIME;
                    if (!accepted) {
                        fs.unlink(
                            path.join(
                                plugin.getApi().getMediaRoot(),
                                file.path,
                            ),
                        ).catch(() => {});
                        return null;
                    }

                    const title = stripExt(file.name);
                    const presentationId = makePresentationId();
                    const job = plugin.presentationImports.start({
                        filename: file.name,
                        title,
                        presentationId,
                    });
                    return {
                        type: 'slides',
                        title,
                        data: { presentationId, importJobId: job.id },
                        immediate: true,
                    };
                },
            },
        },
    );
}

function dispatchVideo(plugin: LappisOverlayPlugin, id: string, options?: any) {
    if (options?.playNow) plugin.video.playVideo(id, options);
    else plugin.video.queueVideo(id, options);
}
