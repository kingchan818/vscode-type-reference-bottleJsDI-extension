import { window } from 'vscode';

export function getWorkspaceRootPath() {
    const editor = window.activeTextEditor;
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