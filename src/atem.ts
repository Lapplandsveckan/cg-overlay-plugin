import {config} from './config';
import {Atem} from 'atem-connection';

export class AtemManager {
    private connection: Atem = null;
    public connected = false;

    public connect(ip: string) {
        this.connection = new Atem();
        this.connection.on('info', console.log);
        this.connection.on('error', console.error);

        this.connection.on('connected', () => this.connected = true);
        this.connection.on('disconnected', () => this.connected = false);

        this.connection.connect(ip);
    }

    public disconnect() {
        this.connection.disconnect();
        this.connection = null;
        this.connected = false;
    }

    public setVideoProgram() {
        if (!this.connected) return console.error('ATEM not connected');
        if (config.atem.videoInput < 0) return console.error('No video input selected');

        const { programInput } = this.state;

        this.connection.changePreviewInput(programInput);
        this.connection.changeProgramInput(config.atem.videoInput);
    }

    public returnToPreview() {
        if (!this.connected) return console.error('ATEM not connected');
        const {programInput, previewInput} = this.state;

        this.connection.changePreviewInput(programInput);
        this.connection.changeProgramInput(previewInput);
    }

    private get state() {
        return this.connection.state.video.mixEffects[0];
    }
}
