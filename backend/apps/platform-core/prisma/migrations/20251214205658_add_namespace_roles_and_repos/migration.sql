-- CreateEnum
CREATE TYPE "NamespaceRole" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "UserNamespace" ADD COLUMN     "role" "NamespaceRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "Repo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "namespaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Repo" ADD CONSTRAINT "Repo_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "Namespace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
