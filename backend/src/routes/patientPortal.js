const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, generateToken } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

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

    const [appointments, pendingTests, recentMood, orgSettings] = await Promise.all([
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
      user.organizationId
        ? prisma.organizationSetting.findUnique({
            where: { organizationId: user.organizationId },
            select: { allowPatientBooking: true, businessName: true, logo: true, primaryColor: true, accentColor: true, secondaryColor: true }
          })
        : null
    ]);

    res.json({
      upcomingAppointments: appointments,
      pendingTests,
      recentMood,
      patientName: user.name,
      allowBooking: orgSettings?.allowPatientBooking ?? true,
      clinicName: orgSettings?.businessName || null,
      clinicLogo: orgSettings?.logo || null,
      primaryColor: orgSettings?.primaryColor || null,
      accentColor: orgSettings?.accentColor || orgSettings?.secondaryColor || null,
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

    const payments = await prisma.payment.findMany({
      where: { patientId: user.patientId },
      orderBy: { createdAt: 'desc' },
      include: { appointment: { select: { date: true, type: true } } }
    });

    const summary = {
      total: payments.reduce((s, p) => s + Number(p.value), 0),
      paid: payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.value), 0),
      pending: payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.value), 0)
    };

    res.json({ payments, summary });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar financeiro' });
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
      select: { professionalId: true, professional: { select: { name: true } } }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0=Sunday

    // Don't allow weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.json({ slots: [], professionalName: patient.professional.name });
    }

    // Get existing appointments for that professional on that date
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId: patient.professionalId,
        date: targetDate,
        status: { notIn: ['cancelled'] }
      },
      select: { time: true, duration: true }
    });

    const bookedTimes = new Set(existingAppointments.map(a => a.time));

    // Generate slots from 08:00 to 18:00 (50-minute sessions)
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (const minute of ['00', '50']) {
        if (hour === 17 && minute === '50') continue; // skip 17:50
        const time = `${String(hour).padStart(2, '0')}:${minute}`;
        slots.push({
          time,
          available: !bookedTimes.has(time)
        });
      }
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
      select: { id: true, professionalId: true, sessionValue: true }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    // Check if slot is still available
    const targetDate = new Date(date);
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
        duration: 50,
        value: patient.sessionValue || 0,
        status: 'scheduled',
        paymentStatus: 'pending',
        mode: mode || 'in_person',
        notes: notes || null
      },
      include: { professional: { select: { name: true } } }
    });

    res.status(201).json(appointment);
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

// POST /api/patient-portal/messages - create patient message
router.post('/messages', authMiddleware, async (req, res) => {
  try {
    const { type, content, fileName, mimeType } = req.body;
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
        type,
        content,
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
