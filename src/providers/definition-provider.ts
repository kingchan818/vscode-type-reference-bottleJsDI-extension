import * as fs from 'fs';
import { find, first, kebabCase, toLower, trimEnd } from 'lodash';
import * as path from 'path';
import {
    CancellationToken, Definition, DefinitionProvider, Location, LocationLink, Position,
    ProviderResult, Range, TextDocument, Uri, workspace
} from 'vscode';

import { getWorkspaceRootPath } from '../utils';
import { Logger } from '../logger';

export class NanoDefinitionProvider implements DefinitionProvider {
    private FILE_MATCHING_STRATEGY = { EXACT_MATCH: 'EXACT_MATCH', LAST_RESORT: 'LAST_RESORT' };
    private defaultConfig: any;
    private logger: Logger;

    constructor(params: { extensionContext?: any; config?: any; logger: Logger, }) {
        this.defaultConfig = params.config;
        this.logger = params.logger;
    }

    getDILevel(word = '') {
        const config = workspace.getConfiguration(this.defaultConfig.name);
        const di_layer_list = config.get('config.di_layer_list') || this.defaultConfig.di_layer_list;
        word = toLower(word);
        return find(di_layer_list, (di_layer) => word.includes(di_layer));
    }

    async getDocument(uri) {
        // Find the document with the specified URI
        try {
            // Open the document with the given URI
            const document = await workspace.openTextDocument(uri);
            // Return the contents of the document as a string
            return document;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // TODO: [LOW] Change it into BFS
    async findFileFromDirectory(rootPath, fileName, strategy = this.FILE_MATCHING_STRATEGY.EXACT_MATCH, foundVariableName) {
        // Read the contents of the directory
        const entries = fs.readdirSync(rootPath, { withFileTypes: true });

        // Iterate over the directory entries
        switch (strategy) {
            case this.FILE_MATCHING_STRATEGY.EXACT_MATCH: {
                this.logger.debug(`Searching for ${fileName} in ${rootPath} with strategy: ${strategy}`);
                for (const entry of entries) {
                    const entryPath = path.join(rootPath, entry.name);

                    if (entry.isDirectory()) {
                        // If the entry is a directory, recursively scan it
                        const result = await this.findFileFromDirectory(entryPath, fileName, this.FILE_MATCHING_STRATEGY.EXACT_MATCH, foundVariableName);
                        if (result) { return result; }
                    } else {
                        const currentFileName = path.basename(entryPath);
                        // Return the path if found
                        if (currentFileName === fileName) { return entryPath; }
                    }
                }
                break;
            }
            case this.FILE_MATCHING_STRATEGY.LAST_RESORT: {
                this.logger.debug(`Searching for ${fileName} in ${rootPath} with strategy: ${strategy}`);
                // Cases where naming convention cannot find the file
                const diLevel = this.getDILevel(foundVariableName);
                for (const entry of entries) {
                    const entryPath = path.join(rootPath, entry.name);
                    const currentBasePath = path.basename(entryPath);

                    // Found the correct layer
                    // TODO: [LOW] Loop through all the layer instead of giving up at the first find
                    if (currentBasePath === toLower(diLevel)) {
                        const diLevelEntries = fs.readdirSync(entryPath, { withFileTypes: true });
                        for (const diLevelEntry of diLevelEntries) {
                            const diLevelPath = path.join(rootPath, entry.name, diLevelEntry.name);

                            if (!diLevelEntry.isDirectory() && diLevelEntry.isFile() && diLevelEntry.name !== '.DS_Store') {
                                // Read the file 
                                const fileUri = Uri.file(diLevelPath);
                                const diDocument = await this.getDocument(fileUri);

                                const comparingStr = `'${foundVariableName}'`;
                                for (let i = diDocument!.lineCount - 1; i > diDocument!.lineCount - 50 && i > 0; i--) {
                                    const line = diDocument!.lineAt(i)!;
                                    if (line.text.includes(comparingStr)) {
                                        return diLevelPath;
                                    }
                                }
                            }
                        }
                    } else if (entry.isDirectory()) {
                        // If the entry is a directory, recursively scan it
                        const result = await this.findFileFromDirectory(entryPath, fileName, this.FILE_MATCHING_STRATEGY.LAST_RESORT, foundVariableName);
                        if (result) { return result; }
                    }
                }
                break;
            }
            default: {
                break;
            }
        }
        return null;
    }

    async getFileLocation(file, functionName) {
        const diNameInFS = `${kebabCase(file)}.js`;
        const rootPath = getWorkspaceRootPath();

        if (!rootPath || !fs.existsSync(rootPath)) {
            return undefined;
        }

        let diFilePath = await this.findFileFromDirectory(rootPath, diNameInFS, this.FILE_MATCHING_STRATEGY.EXACT_MATCH, file);
        // Try to do last resort if not find
        diFilePath = diFilePath ? diFilePath : await this.findFileFromDirectory(rootPath, diNameInFS, this.FILE_MATCHING_STRATEGY.LAST_RESORT, file);
        if (!diFilePath) { return undefined; };

        if (diFilePath) {
            const fileUri = Uri.file(diFilePath);
            const diDocument = await this.getDocument(fileUri);

            // TODO: [LOW] Improve the comparison logic
            // If functionName is provided, should compare function Str instead
            const comparingStr = functionName ? `function ${functionName}(` : `'${file}'`;
            for (let i = diDocument!.lineCount - 1; i > 0; i--) {
                const line = diDocument!.lineAt(i);
                if (line.text.includes(comparingStr)) {
                    let range = line.range.start;
                    if (line.text.indexOf('(') > 0) { range = new Position(line.lineNumber, line.text.indexOf('(')); };
                    return new Location(diDocument!.uri, range);
                }
            }
            const location = new Location(diDocument!.uri, new Position(0, 0));
            return location;
        }
    }

    provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition | LocationLink[]> {
        const pattern = /[\w-]+/;
        const wordRange = document.getWordRangeAtPosition(position, pattern);

        const fullLeadingText = document.getText(new Range(wordRange!.start.with({ character: 0 }), wordRange!.start));
        const leadingTextList = fullLeadingText.match(/[\w-]+\./);
        const word = document.getText(wordRange);

        // TODO: [LOW] Accept di layer setting in json
        const leadingText = trimEnd(first(leadingTextList), '.');

        if (leadingText) {
            // TODO: [HIGH] Improve the diLevel finding logic
            // Check if possibleDIInstance has keyword in diLayer
            const diLevel = this.getDILevel(leadingText);
            if (!diLevel) { return undefined; };
            return this.getFileLocation(leadingText, word);
        }

        const isPossibleDi = this.getDILevel(word);
        if (isPossibleDi) {
            return this.getFileLocation(word, undefined);
        }

        return undefined;
    }

}