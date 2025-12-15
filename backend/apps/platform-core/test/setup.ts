import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export const setupTestDB = async () => {
    // Spin up Docker PG
    const container = await new PostgreSqlContainer().start();
    const url = container.getConnectionUri();

    // Run Migrations
    process.env.DATABASE_URL = url;
    execSync('npx prisma migrate deploy', { env: process.env });

    return { container, url };
};
