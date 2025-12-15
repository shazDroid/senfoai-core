/*
  Warnings:

  - You are about to drop the column `licenseKey` on the `ProductLicense` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `ProductLicense` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `ProductLicense` table. All the data in the column will be lost.
  - You are about to drop the column `organizationId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[key]` on the table `ProductLicense` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `key` to the `ProductLicense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `namespaceId` to the `ProductLicense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `plan` to the `ProductLicense` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product` to the `ProductLicense` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProductLicense" DROP CONSTRAINT "ProductLicense_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_organizationId_fkey";

-- DropIndex
DROP INDEX "ProductLicense_licenseKey_key";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "traceId" TEXT;

-- AlterTable
ALTER TABLE "ProductLicense" DROP COLUMN "licenseKey",
DROP COLUMN "organizationId",
DROP COLUMN "productName",
ADD COLUMN     "key" TEXT NOT NULL,
ADD COLUMN     "namespaceId" TEXT NOT NULL,
ADD COLUMN     "plan" TEXT NOT NULL,
ADD COLUMN     "product" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "organizationId";

-- DropTable
DROP TABLE "Organization";

-- CreateTable
CREATE TABLE "Namespace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Namespace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNamespace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "namespaceId" TEXT NOT NULL,

    CONSTRAINT "UserNamespace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNamespace_userId_namespaceId_key" ON "UserNamespace"("userId", "namespaceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLicense_key_key" ON "ProductLicense"("key");

-- AddForeignKey
ALTER TABLE "UserNamespace" ADD CONSTRAINT "UserNamespace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNamespace" ADD CONSTRAINT "UserNamespace_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "Namespace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLicense" ADD CONSTRAINT "ProductLicense_namespaceId_fkey" FOREIGN KEY ("namespaceId") REFERENCES "Namespace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
