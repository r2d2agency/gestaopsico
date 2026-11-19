/**
 * Migração de dados do modo clínica.
 *
 * Corrige tenants que já estão com `Organization.mode` clinic/hybrid mas
 * ficaram sem vínculo clínico ativo porque o modo foi ativado pelo superadmin.
 *
 * Também cria Supervisors automaticamente quando o tenant tiver mais de um
 * profissional e vincula os demais profissionais a eles.
 *
 * O script é idempotente e pode ser executado quantas vezes for necessário:
 *   cd backend && node prisma/migrate-clinic-tenants.js
 *
 * Opções:
 *   DRY_RUN=1              apenas mostra o que seria alterado
 *   ORG_SLUG=slug          limita a execução a uma organização
 *   SUPERVISOR_EMAILS=a@b,c@d  força esses usuários como supervisores
 *   NO_AUTO_SUPERVISOR=1   não escolhe supervisores automaticamente
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const dryRun = process.env.DRY_RUN === '1';
const orgSlug = process.env.ORG_SLUG || null;
const noAutoSupervisor = process.env.NO_AUTO_SUPERVISOR === '1';
const forcedSupervisorEmails = new Set(
  (process.env.SUPERVISOR_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

const OWNER_ROLES = ['admin', 'superadmin'];
const ELIGIBLE_ROLES = ['professional', 'secretary', ...OWNER_ROLES];
const MIN_PROFESSIONALS_FOR_SUPERVISOR = 2;

function lower(value) {
  return String(value || '').trim().toLowerCase();
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
          supervisorId: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  if (!organizations.length) {
    console.log('Nenhuma organização em modo clínico encontrada.');
    return;
  }

  const counters = {
    plansEnabled: 0,
    plansAlreadyEnabled: 0,
    ownersPromoted: 0,
    supervisorsPromoted: 0,
    membershipsCreated: 0,
    membershipsUpdated: 0,
    membershipsAlreadyActive: 0,
    skipped: 0,
  };

  for (const org of organizations) {
    console.log(`\n[${org.slug}] ${org.name} — modo=${org.mode}, plano=${org.planRef?.slug || org.plan || 'sem plano'}`);

    if (!org.planRef && !org.plan) {
      console.log('  ⚠ Sem plano vinculado; atualize o plano manualmente.');
      counters.skipped += 1;
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
      counters.plansEnabled += 1;
    } else {
      counters.plansAlreadyEnabled += 1;
    }

    const membersByUserId = new Map(org.clinicMembers.map((member) => [member.userId, member]));
    const adminMember = org.clinicMembers.find((member) => OWNER_ROLES.includes(member.role));
    const ownerCandidate = adminMember
      ? null
      : org.users.find((user) => OWNER_ROLES.includes(user.role)) ||
        org.users.find((user) => user.role === 'professional');

    if (!adminMember && !ownerCandidate) {
      console.log('  ⚠ Nenhum usuário ativo elegível para ser o administrador da clínica.');
      counters.skipped += 1;
      continue;
    }

    if (adminMember) {
      counters.membershipsAlreadyActive += 1;
      console.log(`  ℹ Vínculo administrativo já ativo: ${adminMember.userId}`);
    } else {
      if (ownerCandidate.role === 'professional') {
        if (dryRun) {
          console.log(`  → promoveria ${ownerCandidate.email} a admin`);
        } else {
          await prisma.user.update({
            where: { id: ownerCandidate.id },
            data: { role: 'admin' },
          });
          console.log(`  ✓ ${ownerCandidate.email} promovido a admin`);
        }
        counters.ownersPromoted += 1;
      }

      if (dryRun) {
        console.log(`  → criaria vínculo clínico de admin para ${ownerCandidate.email}`);
      } else {
        await prisma.clinicMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: org.id,
              userId: ownerCandidate.id,
            },
          },
          create: {
            organizationId: org.id,
            userId: ownerCandidate.id,
            role: 'admin',
            status: 'active',
            createdBy: ownerCandidate.id,
          },
          update: {
            role: 'admin',
            status: 'active',
            endedAt: null,
          },
        });
        console.log(`  ✓ vínculo clínico de admin criado para ${ownerCandidate.email}`);
      }
      counters.membershipsCreated += 1;
    }

    const professionalUsers = org.users.filter((user) => user.role === 'professional');
    const adminUserId = adminMember?.userId || ownerCandidate?.id;
    const forcedSupervisors = professionalUsers.filter((user) => forcedSupervisorEmails.has(lower(user.email)));
    const existingSupervisors = professionalUsers.filter((user) => membersByUserId.get(user.id)?.role === 'supervisor');
    const shouldAutoSelect = !noAutoSupervisor && forcedSupervisorEmails.size === 0 && existingSupervisors.length === 0;
    const autoSupervisor = shouldAutoSelect && professionalUsers.length >= MIN_PROFESSIONALS_FOR_SUPERVISOR
      ? professionalUsers[0]
      : null;
    const selectedSupervisor = forcedSupervisors[0] || existingSupervisors[0] || autoSupervisor;

    if (!selectedSupervisor) {
      if (forcedSupervisorEmails.size && !forcedSupervisors.length) {
        console.log('  ⚠ Nenhum e-mail de supervisor forcado foi encontrado como profissional ativo neste tenant.');
      } else if (!noAutoSupervisor && professionalUsers.length < MIN_PROFESSIONALS_FOR_SUPERVISOR) {
        console.log('  ℹ Menos de dois profissionais; nenhum supervisor foi criado automaticamente.');
      }
      continue;
    }

    const supervisorMember = membersByUserId.get(selectedSupervisor.id);
    if (selectedSupervisor.role !== 'supervisor') {
      if (dryRun) {
        console.log(`  → promoveria ${selectedSupervisor.email} a supervisor`);
      } else {
        await prisma.user.update({
          where: { id: selectedSupervisor.id },
          data: { role: 'supervisor' },
        });
        console.log(`  ✓ ${selectedSupervisor.email} promovido a supervisor`);
      }
      counters.supervisorsPromoted += 1;
    }

    if (!supervisorMember || supervisorMember.role !== 'supervisor') {
      if (dryRun) {
        console.log(`  → criaria/atualizaria vínculo de supervisor para ${selectedSupervisor.email}`);
      } else {
        await prisma.clinicMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: org.id,
              userId: selectedSupervisor.id,
            },
          },
          create: {
            organizationId: org.id,
            userId: selectedSupervisor.id,
            role: 'supervisor',
            status: 'active',
            createdBy: adminUserId || selectedSupervisor.id,
          },
          update: {
            role: 'supervisor',
            status: 'active',
            supervisorId: null,
            endedAt: null,
          },
        });
        console.log(`  ✓ vínculo de supervisor criado para ${selectedSupervisor.email}`);
      }
      counters.membershipsCreated += 1;
    } else {
      counters.membershipsAlreadyActive += 1;
    }

    for (const professional of professionalUsers) {
      if (professional.id === selectedSupervisor.id) continue;

      const currentMember = membersByUserId.get(professional.id);
      if (currentMember?.supervisorId === selectedSupervisor.id && currentMember.role === 'professional') {
        counters.membershipsAlreadyActive += 1;
        continue;
      }

      if (dryRun) {
        console.log(`  → vincularia ${professional.email} ao supervisor ${selectedSupervisor.email}`);
      } else {
        await prisma.clinicMember.upsert({
          where: {
            organizationId_userId: {
              organizationId: org.id,
              userId: professional.id,
            },
          },
          create: {
            organizationId: org.id,
            userId: professional.id,
            role: 'professional',
            status: 'active',
            supervisorId: selectedSupervisor.id,
            createdBy: adminUserId || selectedSupervisor.id,
          },
          update: {
            role: 'professional',
            status: 'active',
            supervisorId: selectedSupervisor.id,
            endedAt: null,
          },
        });
        console.log(`  ✓ ${professional.email} vinculado ao supervisor ${selectedSupervisor.email}`);
      }
      counters.membershipsUpdated += 1;
    }
  }

  console.log('\nResumo:');
  console.log(`  organizações processadas: ${organizations.length}`);
  console.log(`  planos habilitados: ${counters.plansEnabled}`);
  console.log(`  planos já habilitados: ${counters.plansAlreadyEnabled}`);
  console.log(`  responsáveis promovidos: ${counters.ownersPromoted}`);
  console.log(`  supervisores promovidos: ${counters.supervisorsPromoted}`);
  console.log(`  vínculos criados: ${counters.membershipsCreated}`);
  console.log(`  vínculos atualizados: ${counters.membershipsUpdated}`);
  console.log(`  vínculos já ativos: ${counters.membershipsAlreadyActive}`);
  console.log(`  organizações ignoradas: ${counters.skipped}`);
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
