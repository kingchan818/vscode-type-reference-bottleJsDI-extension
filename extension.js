const fs = require('fs');
const {
	find,
	first,
	kebabCase,
	toLower,
	trimEnd,
} = require('lodash');
const path = require('path');
const vscode = require('vscode');


const FILE_MATCHING_STRATEGY = { EXACT_MATCH: 'EXACT_MATCH', LAST_RESORT: 'LAST_RESORT' };
let defaultConfig;

function getDILevel(word = '') {
	const config = vscode.workspace.getConfiguration('bottlejs-extension-pack');
	const di_layer_list = config.get('config.di_layer_list') || defaultConfig.di_layer_list;;
	word = toLower(word);
	return find(di_layer_list, (di_layer) => word.includes(di_layer));
}

async function getDocument(uri) {
	// Find the document with the specified URI
	try {
		// Open the document with the given URI
		const document = await vscode.workspace.openTextDocument(uri);
		// Return the contents of the document as a string
		return document;
	} catch (error) {
		console.error(error);
		return null;
	}
}

// TODO: [LOW] Change it into BFS
async function findFileFromDirectory(rootPath, fileName, strategy = FILE_MATCHING_STRATEGY.EXACT_MATCH, foundVariableName) {
	// Read the contents of the directory
	const entries = fs.readdirSync(rootPath, { withFileTypes: true });

	// Iterate over the directory entries
	switch (strategy) {
		case FILE_MATCHING_STRATEGY.EXACT_MATCH: {
			for (const entry of entries) {
				const entryPath = path.join(rootPath, entry.name);

				if (entry.isDirectory()) {
					// If the entry is a directory, recursively scan it
					const result = await findFileFromDirectory(entryPath, fileName);
					if (result) { return result; }
				} else {
					const currentFileName = path.basename(entryPath);
					// Return the path if found
					if (currentFileName === fileName) { return entryPath; }
				}
			}
			break;
		}
		case FILE_MATCHING_STRATEGY.LAST_RESORT: {
			// Cases where naming convention cannot find the file
			const diLevel = getDILevel(foundVariableName);
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
							const fileUri = vscode.Uri.file(diLevelPath);
							const diDocument = await getDocument(fileUri);

							const comparingStr = `'${foundVariableName}'`;
							for (let i = diDocument.lineCount - 1; i > diDocument.lineCount - 50 && i > 0; i--) {
								const line = diDocument.lineAt(i);
								if (line.text.includes(comparingStr)) {
									return diLevelPath;
								}
							}
						}
					}
				} else if (entry.isDirectory()) {
					// If the entry is a directory, recursively scan it
					const result = await findFileFromDirectory(entryPath, fileName, FILE_MATCHING_STRATEGY.LAST_RESORT, foundVariableName);
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

function getWorkspaceRootPath() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return undefined;
	}
	// Extract source file path
	const currentFilePath = editor.document.uri.fsPath;
	const sourceFileKeyword = 'src';
	const srcIndex = currentFilePath.lastIndexOf(sourceFileKeyword);
	if (srcIndex >= 0) {
		// To include src
		return currentFilePath.substring(0, srcIndex + sourceFileKeyword.length);
	}
}


// TODO: [HIGH] Check on spwaning child processes to find the file location
async function getFileLocation(file, functionName) {
	const diNameInFS = `${kebabCase(file)}.js`;
	const rootPath = getWorkspaceRootPath();

	if (!rootPath || !fs.existsSync(rootPath)) {
		return undefined;
	}

	let diFilePath = await findFileFromDirectory(rootPath, diNameInFS, FILE_MATCHING_STRATEGY.EXACT_MATCH, file);
	// Try to do last resort if not find
	diFilePath = diFilePath ? diFilePath : await findFileFromDirectory(rootPath, diNameInFS, FILE_MATCHING_STRATEGY.LAST_RESORT, file);
	if (!diFilePath) { return undefined; };

	if (diFilePath) {
		const fileUri = vscode.Uri.file(diFilePath);
		const diDocument = await getDocument(fileUri);

		// TODO: [LOW] Improve the comparison logic
		// If functionName is provided, should compare function Str instead
		const comparingStr = functionName ? `function ${functionName}(` : `'${file}'`;
		for (let i = diDocument.lineCount - 1; i > 0; i--) {
			const line = diDocument.lineAt(i);
			if (line.text.includes(comparingStr)) {
				let range = line.range.start;
				if (line.text.indexOf('(') > 0) { range = new vscode.Position(line.lineNumber, line.text.indexOf('(')); };
				return new vscode.Location(diDocument.uri, range);
			}
		}
		return new vscode.Location(diDocument.uri, new vscode.Position(0, 0));
	}
}

class MyDefinitionProvider {
	async provideDefinition(document, position) {

		const pattern = /[\w-]+/;
		const wordRange = document.getWordRangeAtPosition(position, pattern);

		const fullLeadingText = document.getText(new vscode.Range(wordRange.start.with({ character: 0 }), wordRange.start));
		const leadingTextList = fullLeadingText.match(/[\w-]+\./);
		const word = document.getText(wordRange);

		// TODO: [LOW] Accept di layer setting in json
		const leadingText = trimEnd(first(leadingTextList), '.');

		if (leadingText) {
			// TODO: [HIGH] Improve the diLevel finding logic
			// Check if possibleDIInstance has keyword in diLayer
			const diLevel = getDILevel(leadingText);
			if (!diLevel) { return undefined; };
			return getFileLocation(leadingText, word);
		}

		const isPossibleDi = getDILevel(word);
		if (isPossibleDi) {
			return getFileLocation(word);
		}

		return undefined;
	}
}


/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {


	const defaultConfigPath = path.join(context.extensionPath, 'defaultConfig.json');
	defaultConfig = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf-8'));

	// TODO: Add some quote support and randomly show quotes to Support Nano Staff :D
	let disposable = vscode.commands.registerCommand('bottlejs-extension-pack.quotes', function () {
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from BottleJS Extension Pack!');
	});

	const editConfigCommand = vscode.commands.registerCommand('bottlejs-extension-pack.editConfig', async () => {
		await vscode.commands.executeCommand('workbench.action.openSettingsJson');
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(editConfigCommand);
	context.subscriptions.push(
		vscode.languages.registerDefinitionProvider({ language: 'javascript' }, new MyDefinitionProvider())
	);
	// TODO: [URGENT] Implement auto-completion logic
}

// This method is called when your extension is deactivated
function deactivate() { }

module.exports = {
	activate,
	deactivate
};
