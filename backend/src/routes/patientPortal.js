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

    // Verify access to this patient (professional owns it, or admin/secretary in same org)
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true, organizationId: true } });
    const patientWhere = { id: patientId };
    if (!['superadmin', 'admin', 'secretary', 'secretary_financial'].includes(user?.role)) {
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

    const [appointments, pendingTests, recentMood] = await Promise.all([
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
      })
    ]);

    res.json({
      upcomingAppointments: appointments,
      pendingTests,
      recentMood,
      patientName: user.name
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

module.exports = router;
