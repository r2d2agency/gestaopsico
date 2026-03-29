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
        appointments: { orderBy: { date: 'desc' }, take: 10 }
      }
    });
    if (!couple) return res.status(404).json({ error: 'Casal não encontrado' });
    res.json(couple);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar casal' });
  }
});

// POST /api/casais
router.post('/', async (req, res) => {
  try {
    const couple = await prisma.couple.create({
      data: { ...req.body, professionalId: req.userId },
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
