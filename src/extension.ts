import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { NanoDefinitionProvider } from './providers';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    const EXTENSION_NAME = 'nano-backend-language-support';

    // load configuration from workspace
    const defaultConfigPath = path.join(context.extensionPath, 'defaultConfig.json');
    const defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: 'javascript' },
            new NanoDefinitionProvider(defaultConfig)
        )
    );
}

// This method is called when your extension is deactivated
export function deactivate() { }