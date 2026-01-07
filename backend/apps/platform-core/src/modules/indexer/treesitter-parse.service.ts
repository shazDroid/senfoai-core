import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
    FileIR,
    SymbolIR,
    ParseResult,
    CodeNamespace,
    LANGUAGE_EXTENSIONS,
    IGNORED_DIRECTORIES,
    IGNORED_FILES,
} from './types';
import { NamespaceDetectorService } from './namespace-detector.service';

/**
 * TreeSitterParseService
 * Parses source code files and extracts symbols using regex-based extraction
 * (Tree-sitter integration can be added later for more accurate parsing)
 */
@Injectable()
export class TreeSitterParseService {
    private readonly logger = new Logger(TreeSitterParseService.name);

    constructor(
        private readonly namespaceDetector: NamespaceDetectorService
    ) { }

    /**
     * Parse a repository and extract files and symbols
     */
    async parseRepository(
        repoId: string,
        repoLocalPath: string,
        namespaces: CodeNamespace[]
    ): Promise<ParseResult> {
        this.logger.log(`Parsing repository at ${repoLocalPath}`);

        const files: FileIR[] = [];
        const symbols: SymbolIR[] = [];

        // Walk through all files
        const allFiles = this.walkDirectory(repoLocalPath, '');

        for (const relativePath of allFiles) {
            const fullPath = path.join(repoLocalPath, relativePath);
            const ext = path.extname(relativePath).toLowerCase();
            const language = LANGUAGE_EXTENSIONS[ext] || 'unknown';

            // Calculate file hash
            const content = fs.readFileSync(fullPath, 'utf8');
            const hash = crypto.createHash('sha1').update(content).digest('hex');

            // Resolve namespace for this file
            const ns = this.namespaceDetector.resolveFileNamespace(relativePath, namespaces);

            const fileIR: FileIR = {
                path: relativePath.replace(/\\/g, '/'),
                language,
                hash,
                namespace: ns.name
            };
            files.push(fileIR);

            // Extract symbols if we have a supported language
            const fileSymbols = this.extractSymbols(
                repoId,
                relativePath,
                content,
                language,
                ns.name
            );
            symbols.push(...fileSymbols);
        }

        this.logger.log(`Parsed ${files.length} files, extracted ${symbols.length} symbols`);

        return { files, symbols };
    }

    /**
     * Walk directory recursively and return all file paths
     */
    private walkDirectory(basePath: string, relativePath: string): string[] {
        const files: string[] = [];
        const fullPath = path.join(basePath, relativePath);
        const entries = fs.readdirSync(fullPath, { withFileTypes: true });

        for (const entry of entries) {
            const entryRelPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

            if (entry.isDirectory()) {
                // Skip ignored directories
                if (IGNORED_DIRECTORIES.has(entry.name)) {
                    continue;
                }
                files.push(...this.walkDirectory(basePath, entryRelPath));
            } else if (entry.isFile()) {
                // Skip ignored files
                if (IGNORED_FILES.has(entry.name)) {
                    continue;
                }
                // Only include files with known extensions
                const ext = path.extname(entry.name).toLowerCase();
                if (LANGUAGE_EXTENSIONS[ext]) {
                    files.push(entryRelPath);
                }
            }
        }

        return files;
    }

    /**
     * Extract symbols from file content based on language
     */
    private extractSymbols(
        repoId: string,
        filePath: string,
        content: string,
        language: string,
        namespace: string
    ): SymbolIR[] {
        switch (language) {
            case 'typescript':
            case 'javascript':
                return this.extractJsSymbols(repoId, filePath, content, namespace);
            case 'python':
                return this.extractPythonSymbols(repoId, filePath, content, namespace);
            case 'java':
            case 'kotlin':
                return this.extractJavaSymbols(repoId, filePath, content, namespace);
            case 'go':
                return this.extractGoSymbols(repoId, filePath, content, namespace);
            default:
                return [];
        }
    }

    /**
     * Extract symbols from TypeScript/JavaScript files
     */
    private extractJsSymbols(
        repoId: string,
        filePath: string,
        content: string,
        namespace: string
    ): SymbolIR[] {
        const symbols: SymbolIR[] = [];
        const lines = content.split('\n');

        const patterns = [
            // Function declarations
            { regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/gm, kind: 'function' as const },
            // Arrow functions assigned to const
            { regex: /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/gm, kind: 'function' as const },
            // Class declarations
            { regex: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/gm, kind: 'class' as const },
            // Interface declarations
            { regex: /^(?:export\s+)?interface\s+(\w+)/gm, kind: 'interface' as const },
            // Type declarations
            { regex: /^(?:export\s+)?type\s+(\w+)\s*=/gm, kind: 'type' as const },
            // Enum declarations
            { regex: /^(?:export\s+)?enum\s+(\w+)/gm, kind: 'enum' as const },
        ];

        for (const { regex, kind } of patterns) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                const name = match[1];
                const startLine = this.getLineNumber(content, match.index);
                const endLine = this.findSymbolEndLine(lines, startLine, kind);

                symbols.push(this.createSymbol(
                    repoId, filePath, namespace, kind, name, startLine, endLine
                ));
            }
        }

        return symbols;
    }

    /**
     * Extract symbols from Python files
     */
    private extractPythonSymbols(
        repoId: string,
        filePath: string,
        content: string,
        namespace: string
    ): SymbolIR[] {
        const symbols: SymbolIR[] = [];
        const lines = content.split('\n');

        const patterns = [
            { regex: /^(?:async\s+)?def\s+(\w+)\s*\(/gm, kind: 'function' as const },
            { regex: /^class\s+(\w+)/gm, kind: 'class' as const },
        ];

        for (const { regex, kind } of patterns) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                const name = match[1];
                const startLine = this.getLineNumber(content, match.index);
                const endLine = this.findPythonSymbolEnd(lines, startLine);

                symbols.push(this.createSymbol(
                    repoId, filePath, namespace, kind, name, startLine, endLine
                ));
            }
        }

        return symbols;
    }

    /**
     * Extract symbols from Java/Kotlin files
     */
    private extractJavaSymbols(
        repoId: string,
        filePath: string,
        content: string,
        namespace: string
    ): SymbolIR[] {
        const symbols: SymbolIR[] = [];
        const lines = content.split('\n');

        const patterns = [
            { regex: /(?:public|private|protected)?\s*(?:static|abstract|final)*\s*class\s+(\w+)/gm, kind: 'class' as const },
            { regex: /(?:public|private|protected)?\s*(?:static|abstract|final)*\s*interface\s+(\w+)/gm, kind: 'interface' as const },
            { regex: /(?:public|private|protected)?\s*(?:static|abstract|final)*\s*(?:\w+)\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\w+(?:,\s*\w+)*)?\s*\{/gm, kind: 'method' as const },
            { regex: /fun\s+(\w+)\s*\(/gm, kind: 'function' as const }, // Kotlin
        ];

        for (const { regex, kind } of patterns) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                const name = match[1];
                if (name === 'if' || name === 'while' || name === 'for') continue; // Skip control flow
                const startLine = this.getLineNumber(content, match.index);
                const endLine = this.findSymbolEndLine(lines, startLine, kind);

                symbols.push(this.createSymbol(
                    repoId, filePath, namespace, kind, name, startLine, endLine
                ));
            }
        }

        return symbols;
    }

    /**
     * Extract symbols from Go files
     */
    private extractGoSymbols(
        repoId: string,
        filePath: string,
        content: string,
        namespace: string
    ): SymbolIR[] {
        const symbols: SymbolIR[] = [];
        const lines = content.split('\n');

        const patterns = [
            { regex: /^func\s+(\w+)\s*\(/gm, kind: 'function' as const },
            { regex: /^func\s+\([^)]+\)\s+(\w+)\s*\(/gm, kind: 'method' as const },
            { regex: /^type\s+(\w+)\s+struct/gm, kind: 'class' as const },
            { regex: /^type\s+(\w+)\s+interface/gm, kind: 'interface' as const },
        ];

        for (const { regex, kind } of patterns) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                const name = match[1];
                const startLine = this.getLineNumber(content, match.index);
                const endLine = this.findSymbolEndLine(lines, startLine, kind);

                symbols.push(this.createSymbol(
                    repoId, filePath, namespace, kind, name, startLine, endLine
                ));
            }
        }

        return symbols;
    }

    /**
     * Create a SymbolIR with stable ID
     */
    private createSymbol(
        repoId: string,
        filePath: string,
        namespace: string,
        kind: SymbolIR['kind'],
        name: string,
        startLine: number,
        endLine: number
    ): SymbolIR {
        const sidInput = `${repoId}:${filePath}:${kind}:${name}:${startLine}`;
        const sid = crypto.createHash('sha1').update(sidInput).digest('hex');

        return {
            sid,
            filePath: filePath.replace(/\\/g, '/'),
            namespace,
            kind,
            name,
            startLine,
            endLine
        };
    }

    /**
     * Get line number (1-indexed) for a string position
     */
    private getLineNumber(content: string, position: number): number {
        return content.substring(0, position).split('\n').length;
    }

    /**
     * Find the end line of a symbol (brace matching)
     */
    private findSymbolEndLine(lines: string[], startLine: number, kind: string): number {
        // For interfaces and types, may end on same line or soon after
        if (kind === 'type' || kind === 'interface') {
            // Look for closing brace or end of statement
            let braceCount = 0;
            for (let i = startLine - 1; i < Math.min(lines.length, startLine + 100); i++) {
                const line = lines[i];
                braceCount += (line.match(/\{/g) || []).length;
                braceCount -= (line.match(/\}/g) || []).length;
                if (braceCount <= 0 && i > startLine - 1) {
                    return i + 1;
                }
            }
        }

        // For functions/classes/methods, use brace matching
        let braceCount = 0;
        let foundOpen = false;
        for (let i = startLine - 1; i < Math.min(lines.length, startLine + 500); i++) {
            const line = lines[i];
            for (const char of line) {
                if (char === '{') {
                    braceCount++;
                    foundOpen = true;
                } else if (char === '}') {
                    braceCount--;
                }
            }
            if (foundOpen && braceCount === 0) {
                return i + 1;
            }
        }

        return Math.min(startLine + 10, lines.length);
    }

    /**
     * Find end of Python symbol (indentation-based)
     */
    private findPythonSymbolEnd(lines: string[], startLine: number): number {
        const startIndent = this.getIndentLevel(lines[startLine - 1]);

        for (let i = startLine; i < lines.length; i++) {
            const line = lines[i];
            // Skip empty lines
            if (line.trim() === '') continue;

            const indent = this.getIndentLevel(line);
            if (indent <= startIndent && line.trim() !== '') {
                return i; // Previous line was end
            }
        }

        return lines.length;
    }

    /**
     * Get indentation level of a line
     */
    private getIndentLevel(line: string): number {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }
}
