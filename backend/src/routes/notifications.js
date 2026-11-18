const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { loadAccess } = require('../middleware/access');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);
router.use(loadAccess);

router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.access.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar notificações', details: err.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.access.userId },
      data: { readAt: new Date() },
    });
    if (!notification.count) return res.status(404).json({ error: 'Notificação não encontrada' });
    res.json({ message: 'Notificação marcada como lida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar notificação', details: err.message });
  }
});

module.exports = router;
