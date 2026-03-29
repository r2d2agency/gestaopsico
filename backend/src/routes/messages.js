const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/messages - list all conversations for the professional
router.get('/', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, organizationId: true }
    });

    if (!user || !['professional', 'admin', 'superadmin', 'psychologist'].includes(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Get all patients that have messages with this professional
    const conversations = await prisma.$queryRaw`
      SELECT 
        p.id as "patientId",
        p.name as "patientName",
        COUNT(*) FILTER (WHERE m.read_at IS NULL AND m.sender = 'patient') as "unreadCount",
        MAX(m.created_at) as "lastMessageAt",
        (SELECT content FROM patient_portal_messages WHERE patient_id = p.id AND professional_id = ${req.userId} ORDER BY created_at DESC LIMIT 1) as "lastMessage",
        (SELECT sender FROM patient_portal_messages WHERE patient_id = p.id AND professional_id = ${req.userId} ORDER BY created_at DESC LIMIT 1) as "lastSender"
      FROM patient_portal_messages m
      JOIN patients p ON p.id = m.patient_id
      WHERE m.professional_id = ${req.userId}
      GROUP BY p.id, p.name
      ORDER BY MAX(m.created_at) DESC
    `;

    res.json(conversations.map(c => ({
      ...c,
      unreadCount: Number(c.unreadCount),
    })));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar conversas', details: err.message });
  }
});

// GET /api/messages/unread-count - quick count for badge
router.get('/unread-count', async (req, res) => {
  try {
    const count = await prisma.patientPortalMessage.count({
      where: { professionalId: req.userId, sender: 'patient', readAt: null }
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Erro', details: err.message });
  }
});

// GET /api/messages/:patientId - get messages for a specific patient
router.get('/:patientId', async (req, res) => {
  try {
    const messages = await prisma.patientPortalMessage.findMany({
      where: {
        patientId: req.params.patientId,
        professionalId: req.userId,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar mensagens', details: err.message });
  }
});

// POST /api/messages/:patientId - professional replies to patient
router.post('/:patientId', async (req, res) => {
  try {
    const { type, content, fileName, mimeType } = req.body;
    if (!type || !content) {
      return res.status(400).json({ error: 'type e content são obrigatórios' });
    }

    const message = await prisma.patientPortalMessage.create({
      data: {
        patientId: req.params.patientId,
        professionalId: req.userId,
        sender: 'professional',
        type,
        content,
        fileName: fileName || null,
        mimeType: mimeType || null,
      },
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar mensagem', details: err.message });
  }
});

// PATCH /api/messages/:patientId/read - mark all patient messages as read
router.patch('/:patientId/read', async (req, res) => {
  try {
    await prisma.patientPortalMessage.updateMany({
      where: {
        patientId: req.params.patientId,
        professionalId: req.userId,
        sender: 'patient',
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao marcar como lido', details: err.message });
  }
});

module.exports = router;
