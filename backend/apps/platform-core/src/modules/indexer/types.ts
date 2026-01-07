/**
 * IR Types for the Indexer Pipeline
 * Intermediate representations for files, symbols, and namespaces
 */

/**
 * Code namespace/package within a repository (not to be confused with access control namespaces)
 * Examples: "apps/web", "@org/utils", "packages/core"
 */
export interface CodeNamespace {
    name: string;       // e.g., "apps/web" or "@org/utils"
    rootPath: string;   // relative path in repo
}

/**
 * Intermediate representation of a file
 */
export interface FileIR {
    path: string;       // relative path from repo root
    language: string;   // detected language (typescript, python, java, etc.)
    hash: string;       // content hash for change detection
    namespace: string;  // code namespace name this file belongs to
}

/**
 * Intermediate representation of a code symbol (function, class, method, etc.)
 */
export interface SymbolIR {
    sid: string;        // stable ID: sha1(repoId + ":" + filePath + ":" + kind + ":" + name + ":" + startLine)
    filePath: string;   // relative path from repo root
    namespace: string;  // code namespace name
    kind: SymbolKind;   // function, class, method, interface, etc.
    name: string;       // symbol name
    signature?: string; // optional function/method signature
    startLine: number;  // 1-indexed
    endLine: number;    // 1-indexed
}

export type SymbolKind =
    | 'function'
    | 'class'
    | 'method'
    | 'interface'
    | 'enum'
    | 'variable'
    | 'constant'
    | 'type'
    | 'module'
    | 'property';

/**
 * Import relationship (basic, best-effort)
 */
export interface ImportIR {
    fromFile: string;   // file that imports
    toFileHint: string; // import path hint (may need resolution)
    namespace: string;  // code namespace
    importName?: string;// what's being imported
}

/**
 * Result of parsing a repository
 */
export interface ParseResult {
    files: FileIR[];
    symbols: SymbolIR[];
    imports?: ImportIR[];
}

/**
 * Index run options
 */
export interface IndexOptions {
    force?: boolean;    // force re-index even if SHA unchanged
    skipZoekt?: boolean; // skip Zoekt indexing (for testing)
}

/**
 * Index run result
 */
export interface IndexResult {
    success: boolean;
    repoId: string;
    sha: string;
    filesCount: number;
    symbolsCount: number;
    namespacesCount: number;
    durationMs: number;
    error?: string;
}

/**
 * Checkout result from repo checkout service
 */
export interface CheckoutResult {
    localPath: string;
    headSha: string;
}

/**
 * Language detection mapping
 */
export const LANGUAGE_EXTENSIONS: Record<string, string> = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.py': 'python',
    '.java': 'java',
    '.kt': 'kotlin',
    '.kts': 'kotlin',
    '.go': 'go',
    '.rb': 'ruby',
    '.php': 'php',
    '.rs': 'rust',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.cxx': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.swift': 'swift',
    '.scala': 'scala',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.json': 'json',
    '.xml': 'xml',
    '.html': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.less': 'less',
    '.md': 'markdown',
    '.graphql': 'graphql',
    '.gql': 'graphql',
    '.proto': 'protobuf',
    '.tf': 'terraform',
    '.vue': 'vue',
    '.svelte': 'svelte',
};

/**
 * Directories to ignore when parsing
 */
export const IGNORED_DIRECTORIES = new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'target',
    '.next',
    '.gradle',
    'vendor',
    'out',
    '.idea',
    '.vscode',
    '__pycache__',
    '.mypy_cache',
    '.pytest_cache',
    'coverage',
    '.nyc_output',
    'bin',
    'obj',
    '.cache',
    '.turbo',
    '.vercel',
    '.netlify',
]);

/**
 * Files to ignore when parsing
 */
export const IGNORED_FILES = new Set([
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    '.DS_Store',
    'Thumbs.db',
]);
