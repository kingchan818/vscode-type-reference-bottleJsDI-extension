import {
    CompletionItemProvider,
    Position,
    CancellationToken,
    CompletionContext,
    ExtensionContext,
    TextDocument,
    ProviderResult,
    CompletionItem,
    CompletionList,
    CompletionItemKind,
} from 'vscode';
import { forEach, isEmpty, kebabCase, trim } from 'lodash';
import { existsSync, readFileSync, readdirSync } from 'fs';

import { getWorkspaceRootPath } from '../utils';
import { Logger } from '../logger';

export class NanoCompletionProvider implements CompletionItemProvider {
    private logger: Logger;
    public defaultPredefinedDirs = ['service', 'controller', 'manager'];
    public specialPredefinedDirs = [
        { mapKey: 'client', result: 'service-client' },
        { mapKey: 'dao', result: 'data-access/model' },
        { mapKey: 'dal', result: 'data-access/service' }
    ];
    public lastResult: CompletionItem[][] = [];

    constructor(params: { extensionContext?: ExtensionContext; config?: any; logger: Logger }) {
        this.logger = params.logger;
    }

    constructDirName(fileName: string): string | undefined {
        const isSpecialCase = fileName.split('-').some((splitName) => ['dal', 'dao', 'client'].includes(splitName));

        if (isSpecialCase) {
            const foundItem = this.specialPredefinedDirs.find(({ mapKey, result }) => fileName.split('-').includes(mapKey) && result);
            return foundItem?.result;
        } else {
            const foundItem = this.defaultPredefinedDirs.find((dir) => fileName.split('-').includes(dir));
            return foundItem;
        }
    }

    findReturnedFunctions(lines: string[]) {
        const functionNames: string[] = [];
        const stack: string[] = [];
        for (let index = lines.length - 1; index >= 0; index--) {
            const line = lines[index];
            // find a return statement
            if (line.includes('return')) {
                // find the returned functions
                line.includes('{') && stack.push('{');
                for (let downwardIndex = index + 1; downwardIndex < lines.length; downwardIndex++) {
                    const downwardLine = lines[downwardIndex];
                    // check symmetric bracket
                    if (!downwardLine.includes('}')) {
                        functionNames.push(trim(downwardLine.replace(',', '')));
                    } else {
                        stack.pop();
                    }
                    // skip the lines after the return statement
                    if (stack.length === 0) {
                        break;
                    }
                }
                break;
            }
            continue;
        }
        return functionNames;
    }

    findRegisteredInstanceName(basePath: string, files: string[], matchInstanceName): string {
        let result = '';
        for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
            const lines = readFileSync(`${basePath}/${files[fileIdx]}`, 'utf8').split('\n');
            const file = files[fileIdx];

            for (let index = lines.length - 1; index >= 0; index--) {
                const line = lines[index];
                if (line.includes(`registry.service('${matchInstanceName}',`)) {
                    result = file;
                    break;
                } else if (line.includes(`registry.service(`)) {
                    if (lines[index + 1].includes(`${matchInstanceName}`)) {
                        result = file;
                        break;
                    }
                }
                continue;
            }
        }
        return result;
    }

    provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken,
        context: CompletionContext
    ): ProviderResult<CompletionItem[] | CompletionList> {
        const completionItems: CompletionItem[] = [];

        // Get the current line of text
        const lineText = document.lineAt(position.line).text;

        // Split the line into words
        const words = lineText.split(/\s+/).filter((word) => !isEmpty(word));

        forEach(words, (word) => {
            if ((context.triggerCharacter && word.includes(context.triggerCharacter))) {
                const instanceName = word.split('.')[0];
                const fileName = kebabCase(instanceName);
                const dirName = this.constructDirName(fileName);
                if (dirName) {
                    const workspaceRootPath = getWorkspaceRootPath();
                    const filePath = `${workspaceRootPath}/${dirName}/${fileName}.js`;
                    if (existsSync(filePath)) {
                        const lines = readFileSync(filePath, 'utf8').split('\n');
                        const foundFunctions = this.findReturnedFunctions(lines);
                        forEach(foundFunctions, (functionName) => {
                            const completionItem = new CompletionItem(functionName);
                            completionItem.insertText = functionName;
                            completionItem.filterText = functionName;
                            completionItem.kind = CompletionItemKind.Function;
                            completionItems.push(completionItem);
                        });
                    } else {
                        // looping through all file dirName and find which registerFunction start key words contains the instanceName
                        this.logger.warn(`Cannot find file ${filePath}`);
                        this.logger.warn(`Start searching for ${instanceName} under ${dirName} directory`);
                        let foundFileName = '';
                        const filesUnderDir = readdirSync(`${workspaceRootPath}/${dirName}`);
                        foundFileName = this.findRegisteredInstanceName(`${workspaceRootPath}/${dirName}`, filesUnderDir, instanceName);
                        const fileContent = readFileSync(`${workspaceRootPath}/${dirName}/${foundFileName}`, 'utf8');
                        const lines = fileContent.split('\n');
                        const foundFunctions = this.findReturnedFunctions(lines);
                        forEach(foundFunctions, (functionName) => {
                            const completionItem = new CompletionItem(functionName);
                            completionItem.insertText = functionName;
                            completionItem.filterText = functionName;
                            completionItem.kind = CompletionItemKind.Function;
                            completionItems.push(completionItem);
                        });
                    }
                } else {
                    this.logger.warn(`Cannot find dir name for ${fileName}`);
                }
            }
        });

        if (!isEmpty(completionItems)) {
            this.lastResult.push(completionItems);
        }

        this.logger.debug(`Created suggestion list ${JSON.stringify(completionItems)} `);
        return completionItems;
    }

    resolveCompletionItem(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
        return item;
    }
}