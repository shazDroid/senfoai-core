import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as neo4j from 'neo4j-driver';
import { FileIR, SymbolIR, CodeNamespace } from './types';

/**
 * Neo4jWriterService
 * Writes the code knowledge graph to Neo4j as a snapshot per repository
 */
@Injectable()
export class Neo4jWriterService implements OnModuleInit {
    private readonly logger = new Logger(Neo4jWriterService.name);
    private driver: neo4j.Driver;

    constructor() {
        const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
        const user = process.env.NEO4J_USER || 'neo4j';
        const password = process.env.NEO4J_PASSWORD || 'supersecurepassword';

        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
    }

    async onModuleInit() {
        await this.ensureConstraints();
    }

    /**
     * Ensure database constraints exist
     */
    private async ensureConstraints(): Promise<void> {
        const session = this.driver.session();
        try {
            const constraints = [
                'CREATE CONSTRAINT repo_id IF NOT EXISTS FOR (r:Repo) REQUIRE r.repoId IS UNIQUE',
                'CREATE CONSTRAINT ns_id IF NOT EXISTS FOR (n:CodeNamespace) REQUIRE n.nsId IS UNIQUE',
                'CREATE CONSTRAINT file_id IF NOT EXISTS FOR (f:File) REQUIRE f.fileId IS UNIQUE',
                'CREATE CONSTRAINT symbol_id IF NOT EXISTS FOR (s:Symbol) REQUIRE s.sid IS UNIQUE',
            ];

            for (const constraint of constraints) {
                try {
                    await session.run(constraint);
                } catch (error: any) {
                    // Ignore "equivalent already exists" errors
                    if (!error.message?.includes('already exists')) {
                        this.logger.warn(`Constraint creation issue: ${error.message}`);
                    }
                }
            }
            this.logger.log('Neo4j constraints ensured');
        } finally {
            await session.close();
        }
    }

    /**
     * Write a complete repository graph snapshot
     * Deletes existing subgraph and rebuilds from scratch
     */
    async writeSnapshot(
        repoId: string,
        repoName: string,
        gitUrl: string,
        branch: string,
        sha: string,
        namespaces: CodeNamespace[],
        files: FileIR[],
        symbols: SymbolIR[]
    ): Promise<void> {
        const session = this.driver.session();

        try {
            this.logger.log(`Writing Neo4j snapshot for repo ${repoId}: ${files.length} files, ${symbols.length} symbols`);

            // 1. Delete existing subgraph
            await this.deleteRepoSubgraph(session, repoId);

            // 2. Create/merge repo node
            await session.run(`
                MERGE (r:Repo {repoId: $repoId})
                SET r.name = $name,
                    r.gitUrl = $gitUrl,
                    r.branch = $branch,
                    r.sha = $sha,
                    r.indexedAt = datetime()
            `, { repoId, name: repoName, gitUrl, branch, sha });

            // 3. Create namespace nodes
            if (namespaces.length > 0) {
                const nsData = namespaces.map(ns => ({
                    nsId: `${repoId}:${ns.name}`,
                    name: ns.name,
                    rootPath: ns.rootPath
                }));

                await session.run(`
                    UNWIND $namespaces AS ns
                    MERGE (n:CodeNamespace {nsId: ns.nsId})
                    SET n.name = ns.name, n.rootPath = ns.rootPath
                    WITH n, ns
                    MATCH (r:Repo {repoId: $repoId})
                    MERGE (r)-[:HAS_NAMESPACE]->(n)
                `, { namespaces: nsData, repoId });
            }

            // 4. Create file nodes in batches
            await this.batchCreateFiles(session, repoId, files);

            // 5. Create symbol nodes in batches
            await this.batchCreateSymbols(session, repoId, symbols);

            this.logger.log(`Neo4j snapshot complete for repo ${repoId}`);
        } finally {
            await session.close();
        }
    }

    /**
     * Delete existing subgraph for a repository
     */
    private async deleteRepoSubgraph(session: neo4j.Session, repoId: string): Promise<void> {
        // Delete in order: symbols -> files -> namespaces
        // Keep repo node but clear relationships
        await session.run(`
            MATCH (r:Repo {repoId: $repoId})
            OPTIONAL MATCH (r)-[:HAS_NAMESPACE]->(n:CodeNamespace)
            OPTIONAL MATCH (n)-[:CONTAINS_FILE]->(f:File)
            OPTIONAL MATCH (f)-[:DECLARES]->(s:Symbol)
            DETACH DELETE s
        `, { repoId });

        await session.run(`
            MATCH (r:Repo {repoId: $repoId})
            OPTIONAL MATCH (r)-[:HAS_NAMESPACE]->(n:CodeNamespace)
            OPTIONAL MATCH (n)-[:CONTAINS_FILE]->(f:File)
            DETACH DELETE f
        `, { repoId });

        await session.run(`
            MATCH (r:Repo {repoId: $repoId})
            OPTIONAL MATCH (r)-[:HAS_NAMESPACE]->(n:CodeNamespace)
            DETACH DELETE n
        `, { repoId });
    }

    /**
     * Batch create file nodes
     */
    private async batchCreateFiles(
        session: neo4j.Session,
        repoId: string,
        files: FileIR[]
    ): Promise<void> {
        const batchSize = 500;

        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize).map(f => ({
                fileId: `${repoId}:${f.path}`,
                path: f.path,
                language: f.language,
                hash: f.hash,
                nsId: `${repoId}:${f.namespace}`
            }));

            await session.run(`
                UNWIND $files AS f
                MERGE (file:File {fileId: f.fileId})
                SET file.path = f.path,
                    file.language = f.language,
                    file.hash = f.hash,
                    file.repoId = $repoId
                WITH file, f
                MATCH (n:CodeNamespace {nsId: f.nsId})
                MERGE (n)-[:CONTAINS_FILE]->(file)
            `, { files: batch, repoId });
        }
    }

    /**
     * Batch create symbol nodes
     */
    private async batchCreateSymbols(
        session: neo4j.Session,
        repoId: string,
        symbols: SymbolIR[]
    ): Promise<void> {
        const batchSize = 500;

        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize).map(s => ({
                sid: s.sid,
                name: s.name,
                kind: s.kind,
                signature: s.signature || null,
                startLine: s.startLine,
                endLine: s.endLine,
                filePath: s.filePath,
                namespace: s.namespace,
                fileId: `${repoId}:${s.filePath}`
            }));

            await session.run(`
                UNWIND $symbols AS s
                MERGE (sym:Symbol {sid: s.sid})
                SET sym.name = s.name,
                    sym.kind = s.kind,
                    sym.signature = s.signature,
                    sym.startLine = s.startLine,
                    sym.endLine = s.endLine,
                    sym.filePath = s.filePath,
                    sym.namespace = s.namespace,
                    sym.repoId = $repoId
                WITH sym, s
                MATCH (file:File {fileId: s.fileId})
                MERGE (file)-[:DECLARES]->(sym)
            `, { symbols: batch, repoId });
        }
    }

    /**
     * Delete entire repo from Neo4j
     */
    async deleteRepo(repoId: string): Promise<void> {
        const session = this.driver.session();
        try {
            await this.deleteRepoSubgraph(session, repoId);
            await session.run(`
                MATCH (r:Repo {repoId: $repoId})
                DETACH DELETE r
            `, { repoId });
            this.logger.log(`Deleted repo ${repoId} from Neo4j`);
        } finally {
            await session.close();
        }
    }

    /**
     * Query symbols by name
     */
    async findSymbolsByName(repoId: string, name: string, limit = 25): Promise<any[]> {
        const session = this.driver.session();
        try {
            const result = await session.run(`
                MATCH (r:Repo {repoId: $repoId})-[:HAS_NAMESPACE]->(n:CodeNamespace)-[:CONTAINS_FILE]->(f:File)-[:DECLARES]->(s:Symbol)
                WHERE toLower(s.name) = toLower($name)
                RETURN s, f, n
                LIMIT $limit
            `, { repoId, name, limit: neo4j.int(limit) });

            return result.records.map(r => ({
                symbol: r.get('s').properties,
                file: r.get('f').properties,
                namespace: r.get('n').properties
            }));
        } finally {
            await session.close();
        }
    }

    /**
     * Get all namespaces for a repo
     */
    async getNamespaces(repoId: string): Promise<any[]> {
        const session = this.driver.session();
        try {
            const result = await session.run(`
                MATCH (r:Repo {repoId: $repoId})-[:HAS_NAMESPACE]->(n:CodeNamespace)
                RETURN n.name AS name, n.rootPath AS rootPath
                ORDER BY n.name
            `, { repoId });

            return result.records.map(r => ({
                name: r.get('name'),
                rootPath: r.get('rootPath')
            }));
        } finally {
            await session.close();
        }
    }

    /**
     * Close the driver connection
     */
    async onModuleDestroy() {
        await this.driver.close();
    }
}
