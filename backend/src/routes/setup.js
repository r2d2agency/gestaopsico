const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/setup/promote-superadmin
// Promotes current logged-in user to superadmin
// Only works if there are NO superadmins yet (first-time setup)
router.post('/promote-superadmin', authMiddleware, async (req, res) => {
  try {
    // Check if any superadmin exists
    const existingSuperadmin = await prisma.user.findFirst({
      where: { role: 'superadmin' }
    });

    if (existingSuperadmin) {
      return res.status(403).json({ error: 'Já existe um superadmin no sistema' });
    }

    // Promote current user
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { role: 'superadmin' },
      select: { id: true, name: true, email: true, role: true }
    });

    res.json({ message: 'Você agora é superadmin!', user });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao promover superadmin', details: err.message });
  }
});

// POST /api/setup/promote-by-email
// Promotes a user by email to superadmin (requires existing superadmin)
router.post('/promote-by-email', authMiddleware, async (req, res) => {
  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!currentUser || currentUser.role !== 'superadmin') {
      return res.status(403).json({ error: 'Apenas superadmin pode promover outros' });
    }

    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório' });

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return res.status(404).json({ error: 'Usuário não encontrado' });

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: { role: role || 'superadmin' },
      select: { id: true, name: true, email: true, role: true }
    });

    res.json({ message: `Usuário ${updated.email} promovido a ${updated.role}`, user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao promover usuário', details: err.message });
  }
});

module.exports = router;
