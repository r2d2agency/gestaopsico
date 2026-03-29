const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/pacientes
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    const where = { professionalId: req.userId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } }
      ];
    }
    const patients = await prisma.patient.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar pacientes', details: err.message });
  }
});

// GET /api/pacientes/:id
router.get('/:id', async (req, res) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.id, professionalId: req.userId },
      include: { appointments: { orderBy: { date: 'desc' }, take: 10 } }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

// POST /api/pacientes
router.post('/', async (req, res) => {
  try {
    const patient = await prisma.patient.create({
      data: { ...req.body, professionalId: req.userId }
    });
    res.status(201).json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar paciente', details: err.message });
  }
});

// PUT /api/pacientes/:id
router.put('/:id', async (req, res) => {
  try {
    const patient = await prisma.patient.updateMany({
      where: { id: req.params.id, professionalId: req.userId },
      data: req.body
    });
    if (patient.count === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    const updated = await prisma.patient.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
  }
});

// DELETE /api/pacientes/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.patient.deleteMany({
      where: { id: req.params.id, professionalId: req.userId }
    });
    res.json({ message: 'Paciente removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover paciente' });
  }
});

module.exports = router;
