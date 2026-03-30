const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/casais
router.get('/', async (req, res) => {
  try {
    const couples = await prisma.couple.findMany({
      where: { professionalId: req.userId },
      include: {
        patient1: { select: { id: true, name: true } },
        patient2: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(couples);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar casais' });
  }
});

// GET /api/casais/:id
router.get('/:id', async (req, res) => {
  try {
    const couple = await prisma.couple.findFirst({
      where: { id: req.params.id, professionalId: req.userId },
      include: {
        patient1: true,
        patient2: true,
        appointments: { orderBy: { date: 'desc' }, take: 10 },
        records: { orderBy: { date: 'desc' } }
      }
    });
    if (!couple) return res.status(404).json({ error: 'Casal não encontrado' });
    res.json(couple);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar casal' });
  }
});

// GET /api/casais/:id/prontuarios
router.get('/:id/prontuarios', async (req, res) => {
  try {
    const records = await prisma.record.findMany({
      where: { coupleId: req.params.id, professionalId: req.userId },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar prontuários do casal' });
  }
});

// POST /api/casais
router.post('/', async (req, res) => {
  try {
    const { patient1_id, patient2_id, patient1Id, patient2Id, name } = req.body;
    const p1 = patient1Id || patient1_id;
    const p2 = patient2Id || patient2_id;
    if (!p1 || !p2) {
      return res.status(400).json({ error: 'patient1_id e patient2_id são obrigatórios' });
    }
    const couple = await prisma.couple.create({
      data: { patient1Id: p1, patient2Id: p2, name: name || null, professionalId: req.userId },
      include: {
        patient1: { select: { id: true, name: true } },
        patient2: { select: { id: true, name: true } }
      }
    });
    res.status(201).json(couple);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar casal', details: err.message });
  }
});

module.exports = router;
