import { PrismaClient, GlobalRole, NamespaceRole, UserStatus, MembershipStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Create Default Organization
    const org = await prisma.organization.upsert({
        where: { slug: 'default' },
        update: {},
        create: {
            name: 'Senfo AI',
            slug: 'default',
            type: 'cloud',
            authMode: 'SSO_MANAGED',
            bootstrapSuperuserEmail: 'super@senfo.ai',
            bootstrapCompleted: true
        }
    });
    console.log(`✅ Organization created: ${org.name}`);

    // 2. Create Super User
    const superUser = await prisma.user.upsert({
        where: { 
            orgId_email: { orgId: org.id, email: 'super@senfo.ai' } 
        },
        update: { globalRole: GlobalRole.SUPERUSER },
        create: {
            orgId: org.id,
            email: 'super@senfo.ai',
            name: 'Super Admin',
            idp: 'local',
            idpSub: 'super@senfo.ai',
            globalRole: GlobalRole.SUPERUSER,
            status: UserStatus.ACTIVE,
            lastLoginAt: new Date()
        }
    });
    console.log(`✅ Superuser created: ${superUser.email}`);

    // 3. Create Namespace Admin User
    const adminUser = await prisma.user.upsert({
        where: { 
            orgId_email: { orgId: org.id, email: 'admin@meta.com' } 
        },
        update: {},
        create: {
            orgId: org.id,
            email: 'admin@meta.com',
            name: 'Namespace Admin',
            idp: 'local',
            idpSub: 'admin@meta.com',
            globalRole: GlobalRole.USER, // Global role is USER, but will be ADMIN in namespace
            status: UserStatus.ACTIVE,
            lastLoginAt: new Date()
        }
    });
    console.log(`✅ Admin user created: ${adminUser.email}`);

    // 4. Create Regular User
    const regularUser = await prisma.user.upsert({
        where: { 
            orgId_email: { orgId: org.id, email: 'user@example.com' } 
        },
        update: {},
        create: {
            orgId: org.id,
            email: 'user@example.com',
            name: 'Regular User',
            idp: 'local',
            idpSub: 'user@example.com',
            globalRole: GlobalRole.USER,
            status: UserStatus.ACTIVE
        }
    });
    console.log(`✅ Regular user created: ${regularUser.email}`);

    // 5. Create Payments Namespace
    const paymentsNs = await prisma.namespace.upsert({
        where: { 
            orgId_slug: { orgId: org.id, slug: 'payments' } 
        },
        update: {},
        create: {
            orgId: org.id,
            name: 'Payments',
            slug: 'payments',
            description: 'Payments domain workspace',
            createdById: superUser.id
        }
    });
    console.log(`✅ Namespace created: ${paymentsNs.name}`);

    // 6. Create Cards Namespace
    const cardsNs = await prisma.namespace.upsert({
        where: { 
            orgId_slug: { orgId: org.id, slug: 'cards' } 
        },
        update: {},
        create: {
            orgId: org.id,
            name: 'Cards',
            slug: 'cards',
            description: 'Cards domain workspace',
            createdById: superUser.id
        }
    });
    console.log(`✅ Namespace created: ${cardsNs.name}`);

    // 7. Assign admin@meta.com as ADMIN of Payments namespace
    await prisma.namespaceMembership.upsert({
        where: {
            orgId_namespaceId_userId: {
                orgId: org.id,
                namespaceId: paymentsNs.id,
                userId: adminUser.id
            }
        },
        update: { namespaceRole: NamespaceRole.ADMIN },
        create: {
            orgId: org.id,
            namespaceId: paymentsNs.id,
            userId: adminUser.id,
            namespaceRole: NamespaceRole.ADMIN,
            assignedById: superUser.id,
            status: MembershipStatus.ACTIVE
        }
    });
    console.log(`✅ ${adminUser.email} assigned as ADMIN of ${paymentsNs.name}`);

    // 8. Assign admin@meta.com as USER of Cards namespace
    await prisma.namespaceMembership.upsert({
        where: {
            orgId_namespaceId_userId: {
                orgId: org.id,
                namespaceId: cardsNs.id,
                userId: adminUser.id
            }
        },
        update: { namespaceRole: NamespaceRole.USER },
        create: {
            orgId: org.id,
            namespaceId: cardsNs.id,
            userId: adminUser.id,
            namespaceRole: NamespaceRole.USER,
            assignedById: superUser.id,
            status: MembershipStatus.ACTIVE
        }
    });
    console.log(`✅ ${adminUser.email} assigned as USER of ${cardsNs.name}`);

    // 9. Assign regular user to Payments namespace
    await prisma.namespaceMembership.upsert({
        where: {
            orgId_namespaceId_userId: {
                orgId: org.id,
                namespaceId: paymentsNs.id,
                userId: regularUser.id
            }
        },
        update: {},
        create: {
            orgId: org.id,
            namespaceId: paymentsNs.id,
            userId: regularUser.id,
            namespaceRole: NamespaceRole.USER,
            assignedById: superUser.id,
            status: MembershipStatus.ACTIVE
        }
    });
    console.log(`✅ ${regularUser.email} assigned as USER of ${paymentsNs.name}`);

    // 10. Create sample repository (create or skip if gitUrl exists)
    const existingRepo = await prisma.repository.findFirst({
        where: { orgId: org.id, namespaceId: paymentsNs.id, gitUrl: 'https://github.com/example/payments-service.git' }
    });

    if (!existingRepo) {
        await prisma.repository.create({
            data: {
                orgId: org.id,
                namespaceId: paymentsNs.id,
                name: 'payments-service',
                gitUrl: 'https://github.com/example/payments-service.git',
                defaultBranch: 'main',
                addedById: adminUser.id,
                scanStatus: 'COMPLETED',
                lastScannedAt: new Date()
            }
        });
        console.log(`✅ Sample repository created`);
    } else {
        console.log(`✅ Sample repository already exists`);
    }

    // 11. Create audit log entry
    await prisma.auditLog.create({
        data: {
            orgId: org.id,
            actorId: superUser.id,
            action: 'SEED_COMPLETED',
            metadata: {
                message: 'Database seeded successfully',
                timestamp: new Date().toISOString()
            }
        }
    });
    console.log(`✅ Audit log entry created`);

    console.log('\n🎉 Seeding completed!');
    console.log('\n📋 Test Users:');
    console.log('   • super@senfo.ai - SUPERUSER (platform admin)');
    console.log('   • admin@meta.com - ADMIN in Payments, USER in Cards');
    console.log('   • user@example.com - USER in Payments');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
