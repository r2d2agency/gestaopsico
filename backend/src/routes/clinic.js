const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { loadAccess, requireClinicMember, requireCapability } = require('../middleware/access');
const { logAudit } = require('../services/auditService');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);
router.use(loadAccess);

const CLINIC_MEMBER_ROLES = ['professional', 'secretary', 'financial', 'supervisor'];

function sanitizeRole(role) {
  return role === 'psychologist' ? 'professional' : role;
}

// GET /api/clinic/status
router.get('/status', async (req, res) => {
  try {
    const organization = req.access.organizationId ? await prisma.organization.findUnique({
      where: { id: req.access.organizationId },
      select: { id: true, name: true, mode: true, status: true },
    }) : null;
    res.json({
      organization,
      membership: req.access.hasActiveClinicMember ? {
        role: req.access.role,
        permissions: req.access.permissions,
        supervisorId: req.access.supervisorId,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar status da clínica', details: err.message });
  }
});

// POST /api/clinic/activate - admin ativa o modo clínico para a organização
router.post('/activate', requireCapability('clinic:manage'), async (req, res) => {
  try {
    if (!req.access.organizationId) return res.status(400).json({ error: 'Organização não encontrada' });
    const mode = req.body?.mode === 'clinic' ? 'clinic' : 'hybrid';
    const organization = await prisma.organization.update({
      where: { id: req.access.organizationId },
      data: { mode },
      select: { id: true, name: true, mode: true, status: true },
    });
    await prisma.clinicMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: req.access.organizationId,
          userId: req.access.userId,
        },
      },
      create: {
        organizationId: req.access.organizationId,
        userId: req.access.userId,
        role: 'admin',
        status: 'active',
        createdBy: req.access.userId,
      },
      update: { status: 'active', role: 'admin' },
    });
    await logAudit(req, 'clinic.activated', 'Organization', organization.id, { mode });
    res.json(organization);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ativar modo clínico', details: err.message });
  }
});

// GET /api/clinic/members
router.get('/members', requireClinicMember, async (req, res) => {
  try {
    const members = await prisma.clinicMember.findMany({
      where: { organizationId: req.access.organizationId },
      include: { user: { select: { id: true, name: true, email: true, crp: true, phone: true, specialty: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar membros da clínica', details: err.message });
  }
});

// POST /api/clinic/members - convida/cria um vínculo clínico
router.post('/members', requireClinicMember, requireCapability('team:manage'), async (req, res) => {
  try {
    const { userId, role, supervisorId, permissions = [] } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId é obrigatório' });
    const sanitizedRole = sanitizeRole(role);
    if (!CLINIC_MEMBER_ROLES.includes(sanitizedRole)) {
      return res.status(400).json({ error: 'Perfil inválido para membro da clínica' });
    }
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId: req.access.organizationId, status: 'active' },
      select: { id: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado na organização' });
    if (supervisorId) {
      const supervisor = await prisma.clinicMember.findFirst({
        where: { organizationId: req.access.organizationId, userId: supervisorId, status: 'active', role: { in: ['supervisor', 'admin'] } },
        select: { id: true },
      });
      if (!supervisor) return res.status(400).json({ error: 'Supervisor inválido' });
    }

    const member = await prisma.clinicMember.upsert({
      where: { organizationId_userId: { organizationId: req.access.organizationId, userId } },
      create: {
        organizationId: req.access.organizationId,
        userId,
        role: sanitizedRole,
        supervisorId: supervisorId || null,
        permissions,
        createdBy: req.access.userId,
      },
      update: {
        role: sanitizedRole,
        supervisorId: supervisorId || null,
        permissions,
        status: 'active',
        endedAt: null,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await logAudit(req, 'clinic.member_updated', 'ClinicMember', member.id, { userId, role: sanitizedRole });
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar membro da clínica', details: err.message });
  }
});

// PATCH /api/clinic/members/:id/status - suspende ou encerra um vínculo
router.patch('/members/:id/status', requireClinicMember, requireCapability('team:manage'), async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['active', 'suspended', 'ended'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    const member = await prisma.clinicMember.findFirst({
      where: { id: req.params.id, organizationId: req.access.organizationId },
    });
    if (!member) return res.status(404).json({ error: 'Membro não encontrado' });
    if (member.userId === req.access.userId) return res.status(400).json({ error: 'Você não pode alterar o próprio vínculo' });

    const updated = await prisma.clinicMember.update({
      where: { id: member.id },
      data: { status, endedAt: status === 'ended' ? new Date() : null },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    await logAudit(req, 'clinic.member_status_changed', 'ClinicMember', updated.id, { status });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao alterar status do vínculo', details: err.message });
  }
});

// POST /api/clinic/patient-links - compartilha um paciente da clínica
router.post('/patient-links', requireClinicMember, requireCapability('patient:manage'), async (req, res) => {
  try {
    const { patientId, professionalId, relationType = 'shared', validUntil } = req.body || {};
    if (!patientId || !professionalId) {
      return res.status(400).json({ error: 'patientId e professionalId são obrigatórios' });
    }
    if (!['owner', 'shared'].includes(relationType)) {
      return res.status(400).json({ error: 'Tipo de vínculo inválido' });
    }
    const [patient, professional] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: patientId, scope: 'clinic', professional: { organizationId: req.access.organizationId } },
        select: { id: true },
      }),
      prisma.clinicMember.findFirst({
        where: { organizationId: req.access.organizationId, userId: professionalId, status: 'active' },
        select: { id: true },
      }),
    ]);
    if (!patient) return res.status(404).json({ error: 'Paciente clínico não encontrado' });
    if (!professional) return res.status(404).json({ error: 'Profissional sem vínculo ativo na clínica' });

    const link = await prisma.patientClinicLink.upsert({
      where: {
        organizationId_patientId_professionalId: {
          organizationId: req.access.organizationId,
          patientId,
          professionalId,
        },
      },
      create: {
        organizationId: req.access.organizationId,
        patientId,
        professionalId,
        relationType,
        isPrimary: relationType === 'owner',
        validUntil: validUntil ? new Date(validUntil) : null,
        createdBy: req.access.userId,
      },
      update: {
        relationType,
        isPrimary: relationType === 'owner',
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });
    await logAudit(req, 'clinic.patient_shared', 'Patient', patientId, { professionalId, relationType });
    res.status(201).json(link);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao compartilhar paciente', details: err.message });
  }
});

module.exports = router;
