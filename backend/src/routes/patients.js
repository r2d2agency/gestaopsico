const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Helper: map camelCase Prisma output to snake_case for frontend
function mapPatient(p) {
  if (!p) return p;
  return {
    id: p.id,
    name: p.name,
    cpf: p.cpf,
    birth_date: p.birthDate,
    phone: p.phone,
    email: p.email,
    address: p.address,
    gender: p.gender,
    emergency_contact: p.emergencyContact,
    clinical_notes: p.clinicalNotes,
    health_history: p.healthHistory,
    medications: p.medications,
    allergies: p.allergies,
    status: p.status,
    created_at: p.createdAt,
    professional_id: p.professionalId,
  };
}

// Helper: map snake_case frontend input to camelCase Prisma input
function mapInput(body) {
  const data = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.cpf !== undefined) data.cpf = body.cpf || null;
  if (body.birth_date !== undefined) data.birthDate = body.birth_date ? new Date(body.birth_date) : null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.address !== undefined) data.address = body.address || null;
  if (body.gender !== undefined) data.gender = body.gender || null;
  if (body.emergency_contact !== undefined) data.emergencyContact = body.emergency_contact || null;
  if (body.clinical_notes !== undefined) data.clinicalNotes = body.clinical_notes || null;
  if (body.health_history !== undefined) data.healthHistory = body.health_history || null;
  if (body.medications !== undefined) data.medications = body.medications || null;
  if (body.allergies !== undefined) data.allergies = body.allergies || null;
  if (body.status !== undefined) data.status = body.status;
  return data;
}

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
    res.json(patients.map(mapPatient));
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
    res.json(mapPatient(patient));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

// POST /api/pacientes
router.post('/', async (req, res) => {
  try {
    const data = mapInput(req.body);
    data.professionalId = req.userId;
    if (!data.name) return res.status(400).json({ error: 'Nome é obrigatório' });
    const patient = await prisma.patient.create({ data });
    res.status(201).json(mapPatient(patient));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar paciente', details: err.message });
  }
});

// PUT /api/pacientes/:id
router.put('/:id', async (req, res) => {
  try {
    const data = mapInput(req.body);
    const result = await prisma.patient.updateMany({
      where: { id: req.params.id, professionalId: req.userId },
      data
    });
    if (result.count === 0) return res.status(404).json({ error: 'Paciente não encontrado' });
    const updated = await prisma.patient.findUnique({ where: { id: req.params.id } });
    res.json(mapPatient(updated));
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
