import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient, NamespaceRole, MembershipStatus, RepoScanStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminService {
    private prisma = new PrismaClient();

    constructor(private auditService: AuditService) {}

    // ============================================
    // REPOSITORY MANAGEMENT
    // ============================================

    async addRepository(
        orgId: string,
        addedById: string,
        namespaceId: string,
        data: { name: string; gitUrl: string; defaultBranch?: string }
    ) {
        // Verify namespace exists
        const namespace = await this.prisma.namespace.findFirst({
            where: { id: namespaceId, orgId }
        });

        if (!namespace) {
            throw new HttpException('Namespace not found', HttpStatus.NOT_FOUND);
        }

        // Check for duplicate repo
        const existing = await this.prisma.repository.findFirst({
            where: { orgId, namespaceId, gitUrl: data.gitUrl }
        });

        if (existing) {
            throw new HttpException('Repository already exists in this namespace', HttpStatus.CONFLICT);
        }

        const repo = await this.prisma.repository.create({
            data: {
                orgId,
                namespaceId,
                name: data.name,
                gitUrl: data.gitUrl,
                defaultBranch: data.defaultBranch || 'main',
                addedById,
                scanStatus: RepoScanStatus.PENDING
            }
        });

        await this.auditService.logRepoAdded(orgId, addedById, repo.id, {
            name: data.name,
            gitUrl: data.gitUrl,
            namespaceId,
            namespaceName: namespace.name
        });

        return repo;
    }

    async removeRepository(orgId: string, actorId: string, repoId: string) {
        const repo = await this.prisma.repository.findFirst({
            where: { id: repoId, orgId }
        });

        if (!repo) {
            throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
        }

        await this.prisma.repository.delete({ where: { id: repoId } });

        await this.auditService.logRepoRemoved(orgId, actorId, repoId, {
            name: repo.name,
            gitUrl: repo.gitUrl,
            namespaceId: repo.namespaceId
        });

        return { success: true };
    }

    async triggerScan(orgId: string, actorId: string, repoId: string) {
        const repo = await this.prisma.repository.findFirst({
            where: { id: repoId, orgId }
        });

        if (!repo) {
            throw new HttpException('Repository not found', HttpStatus.NOT_FOUND);
        }

        // Update status to CLONING (actual scanning would be done by a separate service)
        const updated = await this.prisma.repository.update({
            where: { id: repoId },
            data: { scanStatus: RepoScanStatus.CLONING }
        });

        await this.auditService.log({
            orgId,
            actorId,
            action: 'REPO_SCAN_TRIGGERED',
            targetType: 'repo',
            targetId: repoId,
            metadata: { name: repo.name }
        });

        return updated;
    }

    async getNamespaceRepos(orgId: string, namespaceId: string) {
        return this.prisma.repository.findMany({
            where: { orgId, namespaceId },
            include: {
                addedBy: { select: { id: true, email: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    // ============================================
    // NAMESPACE MEMBER MANAGEMENT
    // ============================================

    async assignMember(
        orgId: string,
        assignedById: string,
        namespaceId: string,
        userId: string,
        role: 'ADMIN' | 'USER'
    ) {
        // Verify namespace exists
        const namespace = await this.prisma.namespace.findFirst({
            where: { id: namespaceId, orgId }
        });

        if (!namespace) {
            throw new HttpException('Namespace not found', HttpStatus.NOT_FOUND);
        }

        // Verify user exists
        const user = await this.prisma.user.findFirst({
            where: { id: userId, orgId }
        });

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        // Upsert membership
        const membership = await this.prisma.namespaceMembership.upsert({
            where: {
                orgId_namespaceId_userId: { orgId, namespaceId, userId }
            },
            create: {
                orgId,
                namespaceId,
                userId,
                namespaceRole: role as NamespaceRole,
                assignedById,
                status: MembershipStatus.ACTIVE
            },
            update: {
                namespaceRole: role as NamespaceRole,
                assignedById,
                status: MembershipStatus.ACTIVE,
                assignedAt: new Date()
            }
        });

        await this.auditService.logMembershipAssigned(orgId, assignedById, userId, {
            namespaceId,
            namespaceName: namespace.name,
            role
        });

        return membership;
    }

    async removeMember(
        orgId: string,
        actorId: string,
        namespaceId: string,
        userId: string
    ) {
        const membership = await this.prisma.namespaceMembership.findFirst({
            where: { orgId, namespaceId, userId }
        });

        if (!membership) {
            throw new HttpException('Membership not found', HttpStatus.NOT_FOUND);
        }

        await this.prisma.namespaceMembership.update({
            where: { id: membership.id },
            data: { status: MembershipStatus.REVOKED }
        });

        await this.auditService.logMembershipRevoked(orgId, actorId, userId, { namespaceId });

        return { success: true };
    }

    async getMembers(orgId: string, namespaceId: string) {
        return this.prisma.namespaceMembership.findMany({
            where: { orgId, namespaceId, status: MembershipStatus.ACTIVE },
            include: {
                user: {
                    select: { id: true, email: true, name: true, picture: true, globalRole: true }
                },
                assignedBy: { select: { id: true, email: true, name: true } }
            },
            orderBy: { assignedAt: 'desc' }
        });
    }

    // ============================================
    // USER INVITATION
    // ============================================

    async inviteUser(
        orgId: string,
        invitedById: string,
        namespaceId: string,
        email: string,
        role: 'ADMIN' | 'USER'
    ) {
        // Check if user already exists
        let user = await this.prisma.user.findFirst({
            where: { orgId, email }
        });

        if (user) {
            // User exists, just add to namespace
            return this.assignMember(orgId, invitedById, namespaceId, user.id, role);
        }

        // For now, return a placeholder - in production, you'd send an invite email
        // or create a pending user record
        await this.auditService.log({
            orgId,
            actorId: invitedById,
            action: 'USER_INVITED',
            metadata: { email, namespaceId, role }
        });

        return {
            message: 'Invitation sent',
            email,
            namespaceId,
            role,
            status: 'pending'
        };
    }
}
