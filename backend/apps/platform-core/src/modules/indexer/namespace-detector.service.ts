import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { CodeNamespace } from './types';
import { glob } from 'glob';

/**
 * NamespaceDetectorService
 * Detects code namespaces/packages within a repository (monorepo detection)
 */
@Injectable()
export class NamespaceDetectorService {
    private readonly logger = new Logger(NamespaceDetectorService.name);

    // Standard monorepo conventions to check
    private readonly CONVENTIONAL_DIRS = ['apps', 'packages', 'services', 'libs', 'modules'];

    /**
     * Detect namespaces in a repository
     * Returns array of detected code namespaces
     */
    async detectNamespaces(repoLocalPath: string): Promise<CodeNamespace[]> {
        this.logger.log(`Detecting namespaces in ${repoLocalPath}`);

        const namespaces: CodeNamespace[] = [];

        // 1. Check for pnpm-workspace.yaml
        const pnpmWorkspace = await this.detectPnpmWorkspaces(repoLocalPath);
        if (pnpmWorkspace.length > 0) {
            this.logger.log(`Found pnpm workspaces: ${pnpmWorkspace.length}`);
            return pnpmWorkspace;
        }

        // 2. Check for package.json workspaces (npm/yarn)
        const npmWorkspaces = await this.detectNpmWorkspaces(repoLocalPath);
        if (npmWorkspaces.length > 0) {
            this.logger.log(`Found npm/yarn workspaces: ${npmWorkspaces.length}`);
            return npmWorkspaces;
        }

        // 3. Check conventional directories (apps/, packages/, etc.)
        const conventionalNs = await this.detectConventionalDirs(repoLocalPath);
        if (conventionalNs.length > 0) {
            this.logger.log(`Found conventional dirs: ${conventionalNs.length}`);
            return conventionalNs;
        }

        // 4. Fallback: top-level directories as namespaces
        const topLevelNs = await this.detectTopLevelDirs(repoLocalPath);
        this.logger.log(`Using top-level dirs as namespaces: ${topLevelNs.length}`);
        return topLevelNs;
    }

    /**
     * Detect pnpm workspaces from pnpm-workspace.yaml
     */
    private async detectPnpmWorkspaces(repoPath: string): Promise<CodeNamespace[]> {
        const workspaceFile = path.join(repoPath, 'pnpm-workspace.yaml');

        if (!fs.existsSync(workspaceFile)) {
            return [];
        }

        try {
            const content = fs.readFileSync(workspaceFile, 'utf8');
            const config = yaml.load(content) as { packages?: string[] };

            if (!config?.packages || !Array.isArray(config.packages)) {
                return [];
            }

            return this.resolveWorkspaceGlobs(repoPath, config.packages);
        } catch (error: any) {
            this.logger.warn(`Failed to parse pnpm-workspace.yaml: ${error.message}`);
            return [];
        }
    }

    /**
     * Detect npm/yarn workspaces from package.json
     */
    private async detectNpmWorkspaces(repoPath: string): Promise<CodeNamespace[]> {
        const packageJsonPath = path.join(repoPath, 'package.json');

        if (!fs.existsSync(packageJsonPath)) {
            return [];
        }

        try {
            const content = fs.readFileSync(packageJsonPath, 'utf8');
            const pkg = JSON.parse(content);

            let workspaces: string[] = [];

            // npm/yarn format: { workspaces: ["packages/*"] }
            if (Array.isArray(pkg.workspaces)) {
                workspaces = pkg.workspaces;
            }
            // yarn format: { workspaces: { packages: ["packages/*"] } }
            else if (pkg.workspaces?.packages && Array.isArray(pkg.workspaces.packages)) {
                workspaces = pkg.workspaces.packages;
            }

            if (workspaces.length === 0) {
                return [];
            }

            return this.resolveWorkspaceGlobs(repoPath, workspaces);
        } catch (error: any) {
            this.logger.warn(`Failed to parse package.json: ${error.message}`);
            return [];
        }
    }

    /**
     * Resolve workspace glob patterns to actual directories
     */
    private async resolveWorkspaceGlobs(repoPath: string, patterns: string[]): Promise<CodeNamespace[]> {
        const namespaces: CodeNamespace[] = [];
        const seen = new Set<string>();

        for (const pattern of patterns) {
            // Remove trailing /* or /** for glob matching
            const cleanPattern = pattern.replace(/\/\*+$/, '/*');

            try {
                const matches = await glob(cleanPattern, {
                    cwd: repoPath,
                    ignore: ['node_modules/**', '**/node_modules/**']
                });

                for (const match of matches as string[]) {
                    // Normalize path
                    const rootPath = match.replace(/\\/g, '/');

                    // Check if it's a directory
                    const fullPath = path.join(repoPath, rootPath);
                    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
                        continue;
                    }

                    if (seen.has(rootPath)) continue;
                    seen.add(rootPath);

                    // Try to get package name from package.json
                    const pkgJsonPath = path.join(repoPath, rootPath, 'package.json');
                    let name = rootPath;

                    if (fs.existsSync(pkgJsonPath)) {
                        try {
                            const pkgContent = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
                            if (pkgContent.name) {
                                name = pkgContent.name;
                            }
                        } catch { }
                    }

                    namespaces.push({ name, rootPath });
                }
            } catch (error: any) {
                this.logger.warn(`Glob pattern failed: ${pattern} - ${error.message}`);
            }
        }

        return namespaces;
    }

    /**
     * Detect conventional monorepo directories
     */
    private async detectConventionalDirs(repoPath: string): Promise<CodeNamespace[]> {
        const namespaces: CodeNamespace[] = [];

        for (const dir of this.CONVENTIONAL_DIRS) {
            const dirPath = path.join(repoPath, dir);

            if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
                continue;
            }

            // Get subdirectories
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory() || entry.name.startsWith('.')) {
                    continue;
                }

                const rootPath = `${dir}/${entry.name}`;
                let name = rootPath;

                // Try to get package name from package.json
                const pkgJsonPath = path.join(dirPath, entry.name, 'package.json');
                if (fs.existsSync(pkgJsonPath)) {
                    try {
                        const pkgContent = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
                        if (pkgContent.name) {
                            name = pkgContent.name;
                        }
                    } catch { }
                }

                namespaces.push({ name, rootPath });
            }
        }

        return namespaces;
    }

    /**
     * Fallback: use top-level directories as namespaces
     */
    private async detectTopLevelDirs(repoPath: string): Promise<CodeNamespace[]> {
        const namespaces: CodeNamespace[] = [];
        const entries = fs.readdirSync(repoPath, { withFileTypes: true });

        for (const entry of entries) {
            if (!entry.isDirectory() || entry.name.startsWith('.')) {
                continue;
            }

            // Skip common non-code directories
            const skip = ['node_modules', 'dist', 'build', 'out', '.git', 'coverage'];
            if (skip.includes(entry.name)) {
                continue;
            }

            namespaces.push({
                name: entry.name,
                rootPath: entry.name
            });
        }

        // If no directories found, use root as single namespace
        if (namespaces.length === 0) {
            namespaces.push({
                name: 'root',
                rootPath: '.'
            });
        }

        return namespaces;
    }

    /**
     * Resolve which namespace a file belongs to
     * Returns the namespace with the longest matching rootPath
     */
    resolveFileNamespace(filePath: string, namespaces: CodeNamespace[]): CodeNamespace {
        const normalizedPath = filePath.replace(/\\/g, '/');

        let bestMatch: CodeNamespace | null = null;
        let bestMatchLength = -1;

        for (const ns of namespaces) {
            const nsPath = ns.rootPath.replace(/\\/g, '/');

            // Check if file is under this namespace's root
            if (normalizedPath === nsPath || normalizedPath.startsWith(nsPath + '/')) {
                if (nsPath.length > bestMatchLength) {
                    bestMatch = ns;
                    bestMatchLength = nsPath.length;
                }
            }
        }

        // If no match, use first namespace or create a default
        if (!bestMatch) {
            if (namespaces.length > 0) {
                return namespaces[0];
            }
            return { name: 'root', rootPath: '.' };
        }

        return bestMatch;
    }
}
