const express = require('express');
const bcrypt = require('bcryptjs');
const { authMiddleware } = require('../middleware/auth');
const { loadAccess, requireAnyCapability } = require('../middleware/access');
const { logAudit } = require('../services/auditService');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);
router.use(loadAccess);
// A gestão da equipe é uma operação da organização e não depende do modo clínico.
router.use(requireAnyCapability('team:manage', 'clinic:manage'));

// GET /api/team - list users in the same organization
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.userOrgId) where.organizationId = req.userOrgId;
    else return res.json({ data: [], total: 0 });

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, status: true,
          crp: true, phone: true, specialty: true, createdAt: true,
          _count: { select: { patients: true, appointments: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    res.json({ data, total });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar equipe', details: err.message });
  }
});

// POST /api/team - create a user in the same organization
router.post('/', async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim()?.toLowerCase();
    const password = req.body?.password;
    const role = req.body?.role || 'professional';
    const crp = req.body?.crp?.trim() || null;
    const phone = req.body?.phone?.trim() || null;
    const specialty = req.body?.specialty?.trim() || null;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const allowedRoles = ['professional', 'secretary', 'financial', 'secretary_financial'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Perfil inválido. Permitidos: profissional, secretária, financeiro.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email já cadastrado' });

    if (!req.userOrgId) return res.status(400).json({ error: 'Organização não encontrada' });

    const org = await prisma.organization.findUnique({ where: { id: req.userOrgId } });
    if (!org) return res.status(404).json({ error: 'Organização não encontrada' });

    const userCount = await prisma.user.count({ where: { organizationId: req.userOrgId } });
    if (userCount >= org.maxUsers) {
      return res.status(400).json({ error: `Limite de ${org.maxUsers} usuários atingido. Faça upgrade do plano.` });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name, email, passwordHash, role, status: 'active',
        organizationId: req.userOrgId, crp, phone, specialty,
      },
      select: { id: true, name: true, email: true, role: true, status: true, crp: true, phone: true, specialty: true }
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar membro da equipe', details: err.message });
  }
});

// PATCH /api/team/:id/password - redefine a senha de um membro da equipe
router.patch('/:id/password', async (req, res) => {
  try {
    const { password } = req.body || {};
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' });
    }
    const target = await prisma.user.findFirst({
      where: { id: req.params.id, organizationId: req.access.organizationId },
      select: { id: true, name: true, email: true },
    });
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash: await bcrypt.hash(String(password), 10) },
    });
    await logAudit(req, 'team.password_reset', 'User', target.id, { email: target.email });
    res.json({ message: 'Senha redefinida com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao redefinir senha', details: err.message });
  }
});

// PATCH /api/team/:id/status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, organizationId: req.access.organizationId },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' });
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: { status },
      select: { id: true, name: true, email: true, role: true, status: true }
    });
    await logAudit(req, 'team.status_changed', 'User', user.id, { status });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar status', details: err.message });
  }
});

module.exports = router;
