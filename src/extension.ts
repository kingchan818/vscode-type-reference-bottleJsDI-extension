import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { NanoCompletionProvider, NanoDefinitionProvider } from './providers';
import { Logger } from './logger';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // load configuration from workspace
    const defaultConfigPath = path.join(context.extensionPath, 'defaultConfig.json');
    const defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));
    const workspaceConfig = vscode.workspace.getConfiguration(defaultConfig.name);
    const logger = new Logger(defaultConfig.name, workspaceConfig.log_level || defaultConfig.log_level);

    const constructorParams = {
        extensionContext: context,
        config: defaultConfig,
        logger,
    };

    context.subscriptions.push(
        vscode.languages.registerDefinitionProvider(
            { language: 'javascript' },
            new NanoDefinitionProvider(constructorParams)
        )
    );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: 'javascript' },
            new NanoCompletionProvider(constructorParams),
            '.',
        )
    );
    logger.info('Extension activated...');
}

// This method is called when your extension is deactivated
export function deactivate() { }