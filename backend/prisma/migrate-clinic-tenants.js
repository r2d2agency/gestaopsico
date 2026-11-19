/**
 * Migração de dados do modo clínica.
 *
 * Corrige tenants que já estão com `Organization.mode` clinic/hybrid mas
 * ficaram sem vínculo clínico ativo porque o modo foi ativado pelo superadmin.
 *
 * O script é idempotente e pode ser executado quantas vezes for necessário:
 *   cd backend && node prisma/migrate-clinic-tenants.js
 *
 * Opções:
 *   DRY_RUN=1  apenas mostra o que seria alterado
 *   ORG_SLUG=slug  limita a execução a uma organização
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const dryRun = process.env.DRY_RUN === '1';
const orgSlug = process.env.ORG_SLUG || null;
const OWNER_ROLES = ['admin', 'superadmin'];
const ELIGIBLE_ROLES = ['professional', ...OWNER_ROLES];

function isClinicMode(mode) {
  return mode === 'clinic' || mode === 'hybrid';
}

async function main() {
  const organizations = await prisma.organization.findMany({
    where: {
      mode: { in: ['clinic', 'hybrid'] },
      ...(orgSlug ? { slug: orgSlug } : {}),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      mode: true,
      plan: true,
      planId: true,
      planRef: {
        select: {
          id: true,
          slug: true,
          hasClinicMode: true,
        },
      },
      users: {
        where: {
          status: 'active',
          role: { in: ELIGIBLE_ROLES },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      clinicMembers: {
        where: { status: 'active' },
        select: {
          id: true,
          userId: true,
          role: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (!organizations.length) {
    console.log('Nenhuma organização em modo clínico encontrada.');
    return;
  }

  let plansEnabled = 0;
  let ownersPromoted = 0;
  let membershipsCreated = 0;
  let plansAlreadyEnabled = 0;
  let membershipsAlreadyActive = 0;
  let skipped = 0;

  for (const org of organizations) {
    console.log(`\n[${org.slug}] ${org.name} — modo=${org.mode}, plano=${org.planRef?.slug || org.plan || 'sem plano'}`);

    if (!org.planRef && !org.plan) {
      console.log('  ⚠ Sem plano vinculado; atualize o plano manualmente.');
      skipped += 1;
      continue;
    }

    if (!org.planRef?.hasClinicMode) {
      if (dryRun) {
        console.log(`  → habilitaria hasClinicMode no plano ${org.planRef?.slug || org.plan}`);
      } else {
        await prisma.plan.update({
          where: { id: org.planRef.id },
          data: { hasClinicMode: true },
        });
        console.log(`  ✓ hasClinicMode habilitado no plano ${org.planRef.slug}`);
      }
      plansEnabled += 1;
    } else {
      plansAlreadyEnabled += 1;
    }

    const activeMemberUserIds = new Set(org.clinicMembers.map((member) => member.userId));
    const adminMember = org.clinicMembers.find((member) => OWNER_ROLES.includes(member.role));
    const candidate = adminMember
      ? null
      : org.users.find((user) => user.role === 'admin') ||
        org.users.find((user) => user.role === 'professional');

    if (!adminMember && !candidate) {
      console.log('  ⚠ Nenhum usuário ativo elegível para ser o administrador da clínica.');
      skipped += 1;
      continue;
    }

    if (adminMember) {
      membershipsAlreadyActive += 1;
      console.log(`  ℹ Vínculo administrativo já ativo: ${adminMember.userId}`);
      continue;
    }

    if (candidate.role === 'professional') {
      if (dryRun) {
        console.log(`  → promoveria ${candidate.email} a admin`);
      } else {
        await prisma.user.update({
          where: { id: candidate.id },
          data: { role: 'admin' },
        });
        console.log(`  ✓ ${candidate.email} promovido a admin`);
      }
      ownersPromoted += 1;
    }

    if (activeMemberUserIds.has(candidate.id)) {
      membershipsAlreadyActive += 1;
      console.log(`  ℹ ${candidate.email} já possui vínculo ativo.`);
      continue;
    }

    if (dryRun) {
      console.log(`  → criaria vínculo clínico de admin para ${candidate.email}`);
    } else {
      await prisma.clinicMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: org.id,
            userId: candidate.id,
          },
        },
        create: {
          organizationId: org.id,
          userId: candidate.id,
          role: 'admin',
          status: 'active',
          createdBy: candidate.id,
        },
        update: {
          role: 'admin',
          status: 'active',
          endedAt: null,
        },
      });
      console.log(`  ✓ vínculo clínico de admin criado para ${candidate.email}`);
    }
    membershipsCreated += 1;
  }

  console.log('\nResumo:');
  console.log(`  organizações processadas: ${organizations.length}`);
  console.log(`  planos habilitados: ${plansEnabled}`);
  console.log(`  planos já habilitados: ${plansAlreadyEnabled}`);
  console.log(`  responsáveis promovidos: ${ownersPromoted}`);
  console.log(`  vínculos criados: ${membershipsCreated}`);
  console.log(`  vínculos já ativos: ${membershipsAlreadyActive}`);
  console.log(`  organizações ignoradas: ${skipped}`);
  console.log(dryRun ? '  modo: DRY_RUN (nenhuma alteração gravada)' : '  modo: aplicação de mudanças');
}

main()
  .catch((error) => {
    console.error('Falha na migração:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
