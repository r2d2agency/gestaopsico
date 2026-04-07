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
    nickname: p.nickname,
    cpf: p.cpf,
    birth_date: p.birthDate,
    phone: p.phone,
    email: p.email,
    address: p.address,
    cep: p.cep,
    street: p.street,
    number: p.number,
    complement: p.complement,
    neighborhood: p.neighborhood,
    city: p.city,
    state: p.state,
    whatsapp_valid: p.whatsappValid,
    gender: p.gender,
    emergency_contact: p.emergencyContact,
    clinical_notes: p.clinicalNotes,
    health_history: p.healthHistory,
    medications: p.medications,
    allergies: p.allergies,
    status: p.status,
    created_at: p.createdAt,
    professional_id: p.professionalId,
    billing_mode: p.billingMode,
    monthly_value: p.monthlyValue ? Number(p.monthlyValue) : null,
    session_value: p.sessionValue ? Number(p.sessionValue) : null,
    charge_notification_mode: p.chargeNotificationMode,
    charge_day: p.chargeDay,
    charge_time: p.chargeTime,
    charge_enabled: p.chargeEnabled,
    registration_token: p.registrationToken,
    registration_completed: p.registrationCompleted,
  };
}

function mapInput(body) {
  const data = {};
  if (body.nickname !== undefined) data.nickname = body.nickname || null;
  if (body.name !== undefined) data.name = body.name;
  if (body.cpf !== undefined) data.cpf = body.cpf || null;
  if (body.birth_date !== undefined) data.birthDate = body.birth_date ? new Date(body.birth_date) : null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.address !== undefined) data.address = body.address || null;
  if (body.cep !== undefined) data.cep = body.cep || null;
  if (body.street !== undefined) data.street = body.street || null;
  if (body.number !== undefined) data.number = body.number || null;
  if (body.complement !== undefined) data.complement = body.complement || null;
  if (body.neighborhood !== undefined) data.neighborhood = body.neighborhood || null;
  if (body.city !== undefined) data.city = body.city || null;
  if (body.state !== undefined) data.state = body.state || null;
  if (body.whatsapp_valid !== undefined) data.whatsappValid = Boolean(body.whatsapp_valid);
  if (body.gender !== undefined) data.gender = body.gender || null;
  if (body.emergency_contact !== undefined) data.emergencyContact = body.emergency_contact || null;
  if (body.clinical_notes !== undefined) data.clinicalNotes = body.clinical_notes || null;
  if (body.health_history !== undefined) data.healthHistory = body.health_history || null;
  if (body.medications !== undefined) data.medications = body.medications || null;
  if (body.allergies !== undefined) data.allergies = body.allergies || null;
  if (body.status !== undefined) data.status = body.status;
  if (body.billing_mode !== undefined) data.billingMode = body.billing_mode;
  if (body.monthly_value !== undefined) data.monthlyValue = body.monthly_value ? parseFloat(body.monthly_value) : null;
  if (body.session_value !== undefined) data.sessionValue = body.session_value ? parseFloat(body.session_value) : null;
  if (body.charge_notification_mode !== undefined) data.chargeNotificationMode = body.charge_notification_mode;
  if (body.charge_day !== undefined) data.chargeDay = body.charge_day ? parseInt(body.charge_day) : null;
  if (body.charge_time !== undefined) data.chargeTime = body.charge_time;
  if (body.charge_enabled !== undefined) data.chargeEnabled = Boolean(body.charge_enabled);
  return data;
}

// CPF validation
function isValidCPF(cpf) {
  const cleaned = (cpf || '').replace(/\D/g, '');
  if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  if (parseInt(cleaned[9]) !== d1) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  return parseInt(cleaned[10]) === d2;
}

// GET /api/pacientes
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;

    // Fetch user to determine role and org
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, organizationId: true }
    });

    const where = {};

    // Role-based filtering — everyone only sees patients from their own organization
    if (['superadmin', 'admin', 'secretary', 'financial', 'secretary_financial'].includes(user?.role)) {
      if (user.organizationId) {
        where.professional = { organizationId: user.organizationId };
      }
    } else {
      // professional sees only their own patients
      where.professionalId = req.userId;
    }

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search } }
      ];
    }
    const patients = await prisma.patient.findMany({
      where,
      include: { professional: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(patients.map(mapPatient));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar pacientes', details: err.message });
  }
});

// GET /api/pacientes/:id
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true, organizationId: true } });
    const whereClause = { id: req.params.id };
    // Restrict by organization for all admin-level roles, by professional for others
    if (['superadmin', 'admin', 'secretary', 'financial', 'secretary_financial'].includes(user?.role)) {
      if (user.organizationId) {
        whereClause.professional = { organizationId: user.organizationId };
      }
    } else {
      whereClause.professionalId = req.userId;
    }
    const patient = await prisma.patient.findFirst({
      where: whereClause,
      include: { appointments: { orderBy: { date: 'desc' }, take: 10 } }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });
    res.json(mapPatient(patient));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar paciente' });
  }
});

// GET /api/pacientes/cep/:cep - ViaCEP lookup
router.get('/cep/:cep', async (req, res) => {
  try {
    const cep = (req.params.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return res.status(400).json({ error: 'CEP inválido' });
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    if (data.erro) return res.status(404).json({ error: 'CEP não encontrado' });
    res.json({
      cep: data.cep,
      street: data.logradouro,
      complement: data.complemento,
      neighborhood: data.bairro,
      city: data.localidade,
      state: data.uf,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao consultar CEP' });
  }
});

// GET /api/pacientes/validate-cpf/:cpf
router.get('/validate-cpf/:cpf', async (req, res) => {
  const cpf = (req.params.cpf || '').replace(/\D/g, '');
  if (!isValidCPF(cpf)) return res.json({ valid: false, message: 'CPF inválido' });
  // Check if already exists FOR THIS PROFESSIONAL only
  const existing = await prisma.patient.findFirst({
    where: { cpf: { contains: cpf }, professionalId: req.userId }
  });
  if (existing) {
    return res.json({ valid: true, exists: true, message: 'CPF já cadastrado para este profissional' });
  }
  res.json({ valid: true, exists: false });
});

// POST /api/pacientes
router.post('/', async (req, res) => {
  try {
    const data = mapInput(req.body);
    // Admin can assign to a specific professional; otherwise defaults to self
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } });
    if (req.body.professional_id && ['superadmin', 'admin', 'secretary', 'secretary_financial'].includes(user?.role)) {
      data.professionalId = req.body.professional_id;
    } else {
      data.professionalId = req.userId;
    }
    if (!data.name) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (data.cpf && !isValidCPF(data.cpf)) return res.status(400).json({ error: 'CPF inválido' });
    const patient = await prisma.patient.create({ data });
    res.status(201).json(mapPatient(patient));
  } catch (err) {
    if (err.code === 'P2002' && (err.meta?.target?.includes('cpf') || err.meta?.target?.includes('patients_cpf_professional_id_key'))) {
      return res.status(400).json({ error: 'CPF já cadastrado para este profissional' });
    }
    res.status(500).json({ error: 'Erro ao criar paciente', details: err.message });
  }
});

// PUT /api/pacientes/:id
router.put('/:id', async (req, res) => {
  try {
    const data = mapInput(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true, organizationId: true } });
    const whereClause = { id: req.params.id };
    if (['superadmin', 'admin', 'secretary', 'financial', 'secretary_financial'].includes(user?.role)) {
      if (user.organizationId) {
        whereClause.professional = { organizationId: user.organizationId };
      }
    } else {
      whereClause.professionalId = req.userId;
    }
    // Verify patient exists within scope
    const existing = await prisma.patient.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ error: 'Paciente não encontrado' });
    const updated = await prisma.patient.update({ where: { id: existing.id }, data });
    res.json(mapPatient(updated));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar paciente' });
  }
});

// DELETE /api/pacientes/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true, organizationId: true } });
    const whereClause = { id: req.params.id };
    if (['superadmin', 'admin', 'secretary', 'financial', 'secretary_financial'].includes(user?.role)) {
      if (user.organizationId) {
        whereClause.professional = { organizationId: user.organizationId };
      }
    } else {
      whereClause.professionalId = req.userId;
    }
    const existing = await prisma.patient.findFirst({ where: whereClause });
    if (!existing) return res.status(404).json({ error: 'Paciente não encontrado' });
    await prisma.patient.delete({ where: { id: existing.id } });
    res.json({ message: 'Paciente removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover paciente' });
  }
});

// POST /api/pacientes/:id/registration-link - generate registration completion link
router.post('/:id/registration-link', async (req, res) => {
  try {
    const crypto = require('crypto');
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true, organizationId: true } });
    const whereClause = { id: req.params.id };
    if (['superadmin', 'admin', 'secretary', 'financial', 'secretary_financial'].includes(user?.role)) {
      if (user.organizationId) whereClause.professional = { organizationId: user.organizationId };
    } else {
      whereClause.professionalId = req.userId;
    }
    const patient = await prisma.patient.findFirst({ where: whereClause, include: { professional: { select: { organizationId: true, organization: { select: { portalSlug: true } } } } } });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.patient.update({ where: { id: patient.id }, data: { registrationToken: token, registrationCompleted: false } });

    const portalSlug = patient.professional?.organization?.portalSlug || '';
    const baseUrl = process.env.FRONTEND_URL || req.headers.origin || '';
    const link = `${baseUrl}/completar-cadastro/${token}`;

    res.json({ link, token, patient_phone: patient.phone });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar link', details: err.message });
  }
});

module.exports = router;
