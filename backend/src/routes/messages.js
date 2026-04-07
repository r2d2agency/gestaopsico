const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

async function getRequesterContext(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, organizationId: true },
  });
}

function canAccessMessages(role) {
  return ['professional', 'psychologist', 'admin', 'superadmin', 'secretary', 'financial', 'secretary_financial'].includes(role);
}

function buildMessageWhere(user) {
  if (!user) return null;
  if (user.role === 'superadmin') return {};
  if (['admin', 'secretary', 'financial', 'secretary_financial'].includes(user.role) && user.organizationId) {
    return {
      professional: {
        organizationId: user.organizationId,
      },
    };
  }
  return { professionalId: user.id };
}

function getMessagePreview(message) {
  if (message.type === 'audio') return '🎤 Áudio';
  if (message.type === 'file') return message.fileName || '📎 Arquivo';
  return message.content;
}

async function resolveConversationProfessionalId(patientId, user) {
  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      ...(user.role === 'superadmin'
        ? {}
        : ['admin', 'secretary', 'financial', 'secretary_financial'].includes(user.role) && user.organizationId
          ? { professional: { organizationId: user.organizationId } }
          : { professionalId: user.id }),
    },
    select: { id: true, professionalId: true },
  });

  return patient;
}

router.get('/', async (req, res) => {
  try {
    const user = await getRequesterContext(req.userId);
    if (!user || !canAccessMessages(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const messages = await prisma.patientPortalMessage.findMany({
      where: buildMessageWhere(user),
      include: {
        patient: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const map = new Map();

    for (const message of messages) {
      const key = message.patientId;
      if (!map.has(key)) {
        map.set(key, {
          patientId: message.patient.id,
          patientName: message.patient.name,
          unreadCount: 0,
          lastMessageAt: message.createdAt,
          lastMessage: getMessagePreview(message),
          lastSender: message.sender,
        });
      }

      if (message.sender === 'patient' && !message.readAt) {
        map.get(key).unreadCount += 1;
      }
    }

    res.json(Array.from(map.values()));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar conversas', details: err.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const user = await getRequesterContext(req.userId);
    if (!user || !canAccessMessages(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const count = await prisma.patientPortalMessage.count({
      where: {
        ...buildMessageWhere(user),
        sender: 'patient',
        readAt: null,
      },
    });

    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: 'Erro', details: err.message });
  }
});

router.get('/:patientId', async (req, res) => {
  try {
    const user = await getRequesterContext(req.userId);
    if (!user || !canAccessMessages(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const patient = await resolveConversationProfessionalId(req.params.patientId, user);
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const messages = await prisma.patientPortalMessage.findMany({
      where: {
        patientId: req.params.patientId,
        professionalId: patient.professionalId,
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar mensagens', details: err.message });
  }
});

router.post('/:patientId', async (req, res) => {
  try {
    const user = await getRequesterContext(req.userId);
    if (!user || !canAccessMessages(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { type, content, fileName, mimeType } = req.body;
    if (!type || !content) {
      return res.status(400).json({ error: 'type e content são obrigatórios' });
    }

    const patient = await resolveConversationProfessionalId(req.params.patientId, user);
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const message = await prisma.patientPortalMessage.create({
      data: {
        patientId: req.params.patientId,
        professionalId: patient.professionalId,
        sender: 'professional',
        type,
        content,
        fileName: fileName || null,
        mimeType: mimeType || null,
        readAt: null,
      },
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar mensagem', details: err.message });
  }
});

router.patch('/:patientId/read', async (req, res) => {
  try {
    const user = await getRequesterContext(req.userId);
    if (!user || !canAccessMessages(user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const patient = await resolveConversationProfessionalId(req.params.patientId, user);
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    await prisma.patientPortalMessage.updateMany({
      where: {
        patientId: req.params.patientId,
        professionalId: patient.professionalId,
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
