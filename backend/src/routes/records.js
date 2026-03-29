const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/prontuarios (por paciente via query ou todos)
router.get('/', async (req, res) => {
  try {
    const { patientId, coupleId } = req.query;
    const where = { professionalId: req.userId };
    if (patientId) where.patientId = patientId;
    if (coupleId) where.coupleId = coupleId;

    const records = await prisma.record.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        couple: { select: { id: true, name: true } },
        appointment: { select: { id: true, date: true, time: true, type: true } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar prontuários' });
  }
});

// GET /api/prontuarios/:id
router.get('/:id', async (req, res) => {
  try {
    const record = await prisma.record.findFirst({
      where: { id: req.params.id, professionalId: req.userId },
      include: { patient: true, couple: true, appointment: true }
    });
    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar prontuário' });
  }
});

// POST /api/prontuarios
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body, professionalId: req.userId };
    if (data.date) data.date = new Date(data.date);
    const record = await prisma.record.create({ data });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar prontuário', details: err.message });
  }
});

// PUT /api/prontuarios/:id
router.put('/:id', async (req, res) => {
  try {
    const record = await prisma.record.updateMany({
      where: { id: req.params.id, professionalId: req.userId },
      data: req.body
    });
    if (record.count === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });
    const updated = await prisma.record.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar prontuário' });
  }
});

module.exports = router;
