const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { authMiddleware, generateToken } = require('../middleware/auth');
const { getStoredAudioPath, decodeHeaderValue } = require('../utils/messageAudio');

const router = express.Router();
const prisma = new PrismaClient();

function canAccessPortalMessage(user, message) {
  if (!user || !message) return false;
  if (user.patientId && user.patientId === message.patientId) return true;
  if (user.id === message.professionalId) return true;
  if (user.role === 'superadmin') return true;

  return ['admin', 'secretary', 'financial', 'secretary_financial'].includes(user.role)
    && !!user.organizationId
    && user.organizationId === message.professional?.organizationId;
}

async function getPortalMessageForAccess(userId, messageId) {
  const [user, message] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, patientId: true, organizationId: true },
    }),
    prisma.patientPortalMessage.findUnique({
      where: { id: messageId },
      include: { professional: { select: { organizationId: true } } },
    }),
  ]);

  if (!canAccessPortalMessage(user, message)) return null;
  return message;
}

function decodeLegacyAudioContent(content) {
  const normalized = String(content || '')
    .replace(/^data:[^,]*,?/i, '')
    .replace(/^audo\/bas64,?/i, '')
    .replace(/^audio\/bas64,?/i, '');

  return normalized ? Buffer.from(normalized, 'base64') : null;
}

// POST /api/patient-portal/create-access - professional creates patient login
router.post('/create-access', authMiddleware, async (req, res) => {
  try {
    const { patientId, email, password } = req.body;
    if (!patientId || !email || !password) {
      return res.status(400).json({ error: 'patientId, email e senha são obrigatórios' });
    }

    // Verify access to this patient
    const requester = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true, organizationId: true } });
    const patientWhere = { id: patientId };
    if (!['superadmin', 'admin', 'secretary', 'secretary_financial'].includes(requester?.role)) {
      patientWhere.professionalId = req.userId;
    }
    const patient = await prisma.patient.findFirst({ where: patientWhere });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Check if patient already has a user account
    const existing = await prisma.user.findFirst({
      where: { patientId }
    });
    if (existing) return res.status(409).json({ error: 'Paciente já possui acesso ao portal' });

    // Check if email is taken
    const emailTaken = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (emailTaken) return res.status(409).json({ error: 'Email já em uso' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: patient.name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'patient',
        status: 'active',
        patientId,
        organizationId: (await prisma.user.findUnique({ where: { id: req.userId } }))?.organizationId
      },
      select: { id: true, name: true, email: true, role: true }
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar acesso', details: err.message });
  }
});

// GET /api/patient-portal/dashboard - patient dashboard
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const patient = await prisma.patient.findUnique({
      where: { id: user.patientId },
      include: {
        professional: {
          select: {
            name: true,
            organizationId: true,
          },
        },
      },
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const organizationId = user.organizationId || patient.professional?.organizationId || null;

    const [appointments, pendingTests, recentMood, orgSettings, organization] = await Promise.all([
      prisma.appointment.findMany({
        where: { patientId: user.patientId, status: 'scheduled' },
        orderBy: { date: 'asc' },
        take: 5,
        include: { professional: { select: { name: true } } }
      }),
      prisma.testAssignment.count({
        where: { patientId: user.patientId, status: 'pending' }
      }),
      prisma.moodEntry.findMany({
        where: { patientId: user.patientId },
        orderBy: { date: 'desc' },
        take: 7
      }),
      organizationId
        ? prisma.organizationSetting.findUnique({
            where: { organizationId },
            select: {
              allowPatientBooking: true, requireBookingApproval: true, businessName: true, logo: true,
              primaryColor: true, accentColor: true, secondaryColor: true,
              patientBookingStartHour: true, patientBookingEndHour: true,
              sessionDuration: true, bookingWeekdays: true
            }
          })
        : null,
      organizationId
        ? prisma.organization.findUnique({
            where: { id: organizationId },
            select: { name: true, logo: true }
          })
        : null
    ]);

    res.json({
      upcomingAppointments: appointments,
      pendingTests,
      recentMood,
      patientName: user.name,
      allowBooking: orgSettings?.allowPatientBooking ?? true,
      requireApproval: orgSettings?.requireBookingApproval ?? false,
      clinicName: orgSettings?.businessName || organization?.name || patient.professional?.name || null,
      clinicLogo: orgSettings?.logo || organization?.logo || null,
      primaryColor: orgSettings?.primaryColor || null,
      accentColor: orgSettings?.accentColor || orgSettings?.secondaryColor || null,
      bookingStartHour: orgSettings?.patientBookingStartHour ?? 8,
      bookingEndHour: orgSettings?.patientBookingEndHour ?? 18,
      sessionDuration: orgSettings?.sessionDuration ?? 50,
      bookingWeekdays: orgSettings?.bookingWeekdays || "1,2,3,4,5",
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
});

// GET /api/patient-portal/appointments - patient's appointments
router.get('/appointments', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const appointments = await prisma.appointment.findMany({
      where: { patientId: user.patientId },
      orderBy: { date: 'desc' },
      include: { professional: { select: { name: true } } }
    });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar consultas' });
  }
});

// GET /api/patient-portal/financial - patient's financial
router.get('/financial', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    // Pull from accounts (real billing entries) + legacy payments table
    const [accounts, sessions] = await Promise.all([
      prisma.account.findMany({
        where: { patientId: user.patientId, type: 'receivable' },
        orderBy: { dueDate: 'desc' },
      }),
      prisma.appointment.count({
        where: { patientId: user.patientId, attended: true }
      }),
    ]);

    const total = accounts.reduce((s, a) => s + Number(a.value), 0);
    const paid = accounts.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.value), 0);
    const pending = accounts.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.value), 0);
    const overdue = accounts.filter(a => a.status === 'overdue').reduce((s, a) => s + Number(a.value), 0);

    const items = accounts.map(a => ({
      id: a.id,
      description: a.description,
      value: Number(a.value),
      dueDate: a.dueDate,
      paidAt: a.paidAt,
      status: a.status,
      paymentMethod: a.paymentMethod,
      createdAt: a.createdAt,
    }));

    res.json({
      payments: items, // keep `payments` key for backward compat with the app
      items,
      sessionsCount: sessions,
      summary: {
        total,
        paid,
        pending,
        overdue,
        balance: pending + overdue, // saldo a pagar
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar financeiro', details: err.message });
  }
});

// GET /api/patient-portal/availability?date=YYYY-MM-DD - get available slots for a date
router.get('/availability', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Parâmetro date é obrigatório' });

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const patient = await prisma.patient.findUnique({
      where: { id: user.patientId },
      select: { professionalId: true, professional: { select: { name: true, organizationId: true } } }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Load scheduling settings
    const orgId = user.organizationId || patient.professional?.organizationId;
    const orgSettings = orgId ? await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
      select: { patientBookingStartHour: true, patientBookingEndHour: true, sessionDuration: true, bookingWeekdays: true }
    }) : null;

    const startHour = orgSettings?.patientBookingStartHour ?? 8;
    const endHour = orgSettings?.patientBookingEndHour ?? 18;
    const duration = orgSettings?.sessionDuration ?? 50;
    const allowedWeekdays = (orgSettings?.bookingWeekdays || '1,2,3,4,5').split(',').map(Number);

    const targetDate = new Date(date + 'T00:00:00.000Z');
    const dayOfWeek = targetDate.getDay();

    if (!allowedWeekdays.includes(dayOfWeek)) {
      return res.json({ slots: [], professionalName: patient.professional.name, date });
    }

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId: patient.professionalId,
        date: targetDate,
        status: { notIn: ['cancelled'] }
      },
      select: { time: true, duration: true }
    });

    const bookedTimes = new Set(existingAppointments.map(a => a.time));

    // Generate slots based on configured hours and duration
    const slots = [];
    let currentMinutes = startHour * 60;
    const endMinutes = endHour * 60;
    while (currentMinutes + duration <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push({ time, available: !bookedTimes.has(time) });
      currentMinutes += duration;
    }

    res.json({
      slots,
      professionalName: patient.professional.name,
      date
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar disponibilidade', details: err.message });
  }
});

// POST /api/patient-portal/book - patient books an appointment
router.post('/book', authMiddleware, async (req, res) => {
  try {
    const { date, time, mode, notes } = req.body;
    if (!date || !time) {
      return res.status(400).json({ error: 'Data e horário são obrigatórios' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const patient = await prisma.patient.findUnique({
      where: { id: user.patientId },
      select: { id: true, professionalId: true, sessionValue: true, professional: { select: { organizationId: true } } }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Load org settings for session duration
    const orgId = user.organizationId || patient.professional?.organizationId;
    const orgSettings = orgId ? await prisma.organizationSetting.findUnique({
      where: { organizationId: orgId },
      select: { sessionDuration: true, requireBookingApproval: true }
    }) : null;
    const sessionDuration = orgSettings?.sessionDuration ?? 50;
    const requireApproval = orgSettings?.requireBookingApproval ?? false;

    // Check if slot is still available
    const targetDate = new Date(date + 'T00:00:00.000Z');
    const existing = await prisma.appointment.findFirst({
      where: {
        professionalId: patient.professionalId,
        date: targetDate,
        time,
        status: { notIn: ['cancelled'] }
      }
    });
    if (existing) return res.status(409).json({ error: 'Horário não disponível' });

    const appointment = await prisma.appointment.create({
      data: {
        professionalId: patient.professionalId,
        patientId: patient.id,
        type: 'individual',
        date: targetDate,
        time,
        duration: sessionDuration,
        value: patient.sessionValue || 0,
        status: requireApproval ? 'pending_approval' : 'scheduled',
        paymentStatus: 'pending',
        mode: mode || 'in_person',
        notes: notes || null
      },
      include: { professional: { select: { name: true } } }
    });

    res.status(201).json({ ...appointment, requires_approval: requireApproval });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao agendar consulta', details: err.message });
  }
});
router.get('/messages', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { patientId: true }
    });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const messages = await prisma.patientPortalMessage.findMany({
      where: { patientId: user.patientId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar mensagens', details: err.message });
  }
});

router.get('/messages/:messageId/audio', authMiddleware, async (req, res) => {
  try {
    const message = await getPortalMessageForAccess(req.userId, req.params.messageId);
    if (!message || message.type !== 'audio') {
      return res.status(404).json({ error: 'Áudio não encontrado' });
    }

    const audioPath = getStoredAudioPath(message.id, message.mimeType);
    if (fs.existsSync(audioPath)) {
      res.setHeader('Content-Type', message.mimeType || 'audio/webm');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      return res.sendFile(audioPath);
    }

    const legacyAudioBuffer = decodeLegacyAudioContent(message.content);
    if (!legacyAudioBuffer) {
      return res.status(404).json({ error: 'Áudio não encontrado' });
    }

    res.setHeader('Content-Type', message.mimeType || 'audio/webm');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(legacyAudioBuffer);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao carregar áudio', details: err.message });
  }
});

// POST /api/patient-portal/messages - create patient message
router.post('/messages/audio', authMiddleware, express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '50mb' }), async (req, res) => {
  try {
    if (!req.body || !req.body.length) {
      return res.status(400).json({ error: 'Áudio é obrigatório' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { patientId: true }
    });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const patient = await prisma.patient.findUnique({
      where: { id: user.patientId },
      select: { id: true, professionalId: true }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const mimeType = decodeHeaderValue(req.headers['x-mime-type']) || req.headers['content-type'] || 'audio/webm';
    const fileName = decodeHeaderValue(req.headers['x-file-name']);
    const title = decodeHeaderValue(req.headers['x-message-title']);

    const createdMessage = await prisma.patientPortalMessage.create({
      data: {
        patientId: patient.id,
        professionalId: patient.professionalId,
        sender: 'patient',
        type: 'audio',
        content: 'uploading',
        title: title || null,
        isDiary: true,
        fileName: fileName || null,
        mimeType
      }
    });

    const audioPath = getStoredAudioPath(createdMessage.id, mimeType);
    fs.writeFileSync(audioPath, Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body));

    const message = await prisma.patientPortalMessage.update({
      where: { id: createdMessage.id },
      data: {
        content: `/api/patient-portal/messages/${createdMessage.id}/audio`,
        fileName: fileName || createdMessage.fileName
      }
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar áudio', details: err.message });
  }
});

router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { type, content, fileName, mimeType, title } = req.body;
    if (!type || !content) {
      return res.status(400).json({ error: 'type e content são obrigatórios' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { patientId: true }
    });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const patient = await prisma.patient.findUnique({
      where: { id: user.patientId },
      select: { id: true, professionalId: true }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const message = await prisma.patientPortalMessage.create({
      data: {
        patientId: patient.id,
        professionalId: patient.professionalId,
        sender: 'patient',
        type,
        content,
        title: title || null,
        isDiary: true,
        fileName: fileName || null,
        mimeType: mimeType || null
      }
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar mensagem', details: err.message });
  }
});

module.exports = router;
