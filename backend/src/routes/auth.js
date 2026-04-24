const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient, Prisma } = require('@prisma/client');
const { authMiddleware, generateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../db');

function isDuplicateConstraintError(error) {
  return Boolean(
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') ||
    error?.code === 'P2002' ||
    error?.code === '23505' ||
    error?.meta?.cause?.includes?.('Unique constraint failed') ||
    error?.message?.includes?.('Unique constraint failed') ||
    error?.message?.toLowerCase?.().includes('duplicate key')
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim()?.toLowerCase();
    const password = req.body?.password;
    const planId = req.body?.planId;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

    const passwordHash = await bcrypt.hash(password, 10);

    // If planId provided, create organization with trial
    let organizationId = null;
    if (planId) {
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (plan) {
        const slug = email.split('@')[0].replace(/[^a-z0-9]/g, '') + '-' + Date.now().toString(36);
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + (plan.trialDays || 7));

        const org = await prisma.organization.create({
          data: {
            name: `Consultório ${name.split(' ')[0]}`,
            slug,
            type: 'individual',
            plan: plan.slug,
            planId: plan.id,
            maxUsers: plan.maxUsers,
            status: 'active',
            trialEndsAt,
            email
          }
        });
        organizationId = org.id;
      }
    }

    // Auto-promote first user to superadmin
    const userCount = await prisma.user.count();
    const isFirstUser = userCount === 0;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: isFirstUser ? 'superadmin' : 'professional',
        status: 'active',
        organizationId,
        createdAt: new Date()
      },
      select: { id: true, name: true, email: true, role: true }
    });

    const token = generateToken(user.id);
    res.status(201).json({ user, token });
  } catch (err) {
    if (isDuplicateConstraintError(err)) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      return res.status(400).json({ error: 'Dados inválidos para criar a conta' });
    }
    console.error('register error:', err);
    res.status(500).json({ error: 'Erro interno ao criar conta' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = generateToken(user.id);
    res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no login', details: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, role: true, crp: true, phone: true, specialty: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// PATCH /api/auth/profile - update own profile
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, crp, specialty } = req.body;
    const data = {};
    if (name?.trim()) data.name = name.trim();
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (crp !== undefined) data.crp = crp?.trim() || null;
    if (specialty !== undefined) data.specialty = specialty?.trim() || null;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, name: true, email: true, role: true, crp: true, phone: true, specialty: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar perfil', details: err.message });
  }
});

// PATCH /api/auth/change-password - change own password
router.patch('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { passwordHash }
    });

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar senha', details: err.message });
  }
});

module.exports = router;
