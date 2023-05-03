import { OutputChannel, window } from 'vscode';

export class Logger {
    private channel: OutputChannel;
    private currentLevel: string;

    constructor(name: string, currentLevel: string) {
        this.channel = window.createOutputChannel(name);
        this.currentLevel = currentLevel;
    }

    debug(message: string) {
        if (this.currentLevel !== 'DEBUG') { return; }
        this.channel.appendLine(`[DEBUG] ${message}`);
    }

    info(message: string) {
        this.channel.appendLine(`[INFO] ${message}`);
    }

    warn(message: string) {
        this.channel.appendLine(`[WARN] ${message}`);
    }

    error(message: string) {
        this.channel.appendLine(`[ERROR] ${message}`);
        window.showErrorMessage(message);
    }
}