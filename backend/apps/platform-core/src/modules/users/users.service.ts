import { Injectable } from '@nestjs/common';
import { PrismaClient, User, GlobalRole, UserStatus } from '@prisma/client';

export interface CreateUserInput {
    orgId: string;
    email: string;
    name?: string;
    picture?: string;
    idp?: string;
    idpSub?: string;
    globalRole?: GlobalRole;
}

@Injectable()
export class UsersService {
    private prisma = new PrismaClient();

    async findByEmail(orgId: string, email: string): Promise<User | null> {
        return this.prisma.user.findFirst({
            where: { orgId, email },
            include: { namespaceMemberships: { include: { namespace: true } } }
        });
    }

    async findById(userId: string): Promise<User | null> {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { namespaceMemberships: { include: { namespace: true } } }
        });
    }

    async findOrCreate(data: CreateUserInput): Promise<User> {
        const existing = await this.findByEmail(data.orgId, data.email);
        if (existing) return existing;
        
        return this.prisma.user.create({
            data: {
                orgId: data.orgId,
                email: data.email,
                name: data.name,
                picture: data.picture,
                idp: data.idp,
                idpSub: data.idpSub || data.email,
                globalRole: data.globalRole || GlobalRole.USER,
                status: UserStatus.ACTIVE
            }
        });
    }

    async updateGlobalRole(userId: string, globalRole: GlobalRole): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: { globalRole }
        });
    }

    async updateLastLogin(userId: string): Promise<User> {
        return this.prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() }
        });
    }
}

