const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/consultas
router.get('/', async (req, res) => {
  try {
    const { date, status, professional_id, startDate, endDate } = req.query;
    const where = { professionalId: professional_id || req.userId };
    if (status) where.status = status;
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate + 'T00:00:00.000Z'),
        lte: new Date(endDate + 'T00:00:00.000Z')
      };
    } else if (date) {
      where.date = new Date(date + 'T00:00:00.000Z');
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        couple: { select: { id: true, name: true } }
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }]
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar consultas', details: err.message });
  }
});

// GET /api/consultas/:id
router.get('/:id', async (req, res) => {
  try {
    const appointment = await prisma.appointment.findFirst({
      where: { id: req.params.id, professionalId: req.userId },
      include: {
        patient: true,
        couple: { include: { patient1: true, patient2: true } },
        records: true,
        transcriptions: true
      }
    });
    if (!appointment) return res.status(404).json({ error: 'Consulta não encontrada' });
    res.json(appointment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar consulta' });
  }
});

// POST /api/consultas
router.post('/', async (req, res) => {
  try {
    // Sanitize: convert empty strings to null
    const raw = Object.fromEntries(
      Object.entries(req.body).map(([k, v]) => [k, v === '' ? null : v])
    );
    const data = { ...raw, professionalId: raw.professionalId || req.userId };
    // Remove fields that shouldn't be passed directly
    delete data.patient;
    delete data.couple;
    if (data.date) data.date = new Date(String(data.date) + (String(data.date).includes('T') ? '' : 'T00:00:00.000Z'));
    if (data.value) data.value = Number(data.value) || 0;
    if (data.duration) data.duration = Number(data.duration) || 50;
    const appointment = await prisma.appointment.create({
      data,
      include: { patient: { select: { id: true, name: true } } }
    });
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Erro ao criar consulta:', err);
    res.status(500).json({ error: 'Erro ao criar consulta', details: err.message });
  }
});

// PUT /api/consultas/:id
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.date) data.date = new Date(String(data.date) + (String(data.date).includes('T') ? '' : 'T00:00:00.000Z'));
    const appointment = await prisma.appointment.updateMany({
      where: { id: req.params.id, professionalId: req.userId },
      data
    });
    if (appointment.count === 0) return res.status(404).json({ error: 'Consulta não encontrada' });
    const updated = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: { patient: { select: { id: true, name: true } } }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar consulta' });
  }
});

// POST /api/consultas/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const appointment = await prisma.appointment.updateMany({
      where: { id: req.params.id, professionalId: req.userId },
      data: { status: 'cancelled' }
    });
    if (appointment.count === 0) return res.status(404).json({ error: 'Consulta não encontrada' });
    res.json({ message: 'Consulta cancelada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar consulta' });
  }
});

// POST /api/consultas/:id/attend - mark attendance and auto-create receivable
router.post('/:id/attend', async (req, res) => {
  try {
    const apt = await prisma.appointment.findFirst({
      where: { id: req.params.id, professionalId: req.userId },
      include: { patient: true }
    });
    if (!apt) return res.status(404).json({ error: 'Consulta não encontrada' });

    await prisma.appointment.update({
      where: { id: req.params.id },
      data: { attended: true, status: 'completed' }
    });

    // Auto-create receivable based on patient billing mode
    if (apt.patientId && apt.patient) {
      const patient = apt.patient;
      const value = patient.billingMode === 'monthly'
        ? null // monthly billing is handled separately
        : (patient.sessionValue ? Number(patient.sessionValue) : (apt.value ? Number(apt.value) : 0));

      if (value && value > 0) {
        await prisma.account.create({
          data: {
            professionalId: req.userId,
            type: 'receivable',
            description: `Sessão - ${patient.name}`,
            value,
            dueDate: apt.date,
            category: 'Consulta',
            patientId: apt.patientId,
            status: 'pending'
          }
        });
      }
    }

    res.json({ message: 'Comparecimento registrado e conta a receber gerada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar comparecimento', details: err.message });
  }
});

module.exports = router;
