const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  const email = process.env.SUPERADMIN_EMAIL || 'admin@psicogest.com';
  const password = process.env.SUPERADMIN_PASSWORD || 'admin123456';
  const name = process.env.SUPERADMIN_NAME || 'Administrador';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Ensure existing user is superadmin
    if (existing.role !== 'superadmin') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'superadmin' } });
      console.log(`✅ Usuário ${email} promovido a superadmin`);
    } else {
      console.log(`ℹ️ Superadmin ${email} já existe`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: 'superadmin', status: 'active' }
  });
  console.log(`✅ Superadmin criado: ${email} / ${password}`);
  
  // Seed de recursos globais
  const globalResources = [
    {
      title: 'Manual de Relaxamento Progressivo',
      description: 'Um guia passo a passo para técnicas de relaxamento muscular progressivo de Jacobson.',
      category: 'Ansiedade',
      type: 'Template',
      isGlobal: true
    },
    {
      title: 'Questionário de Autoconhecimento',
      description: 'Série de perguntas para auxiliar o paciente na primeira fase da terapia.',
      category: 'Geral',
      type: 'Template',
      isGlobal: true
    }
  ];

  for (const res of globalResources) {
    const exists = await prisma.therapeuticResource.findFirst({ where: { title: res.title, isGlobal: true } });
    if (!exists) {
      await prisma.therapeuticResource.create({ data: res });
      console.log(`✅ Recurso global criado: ${res.title}`);
    }
  }
}

seed()
  .catch(e => { console.error('Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
