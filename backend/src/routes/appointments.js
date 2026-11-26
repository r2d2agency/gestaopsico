const express = require('express');

const { authMiddleware } = require('../middleware/auth');
const { loadAccess, requireScope } = require('../middleware/access');
const { canAccessScope, scopedWhere } = require('../permissions');
const { resolveProfessionalId } = require('../services/accessService');
const { logAudit } = require('../services/auditService');
const { notifyUsers } = require('../services/notificationService');
const {
  ensureReceivableForAppointment,
  removeReceivableForAppointment,
  sessionBillingValue,
} = require('../services/billingService');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);
router.use(loadAccess);

function dataRequestProfessionalId(body = {}) {
  return body.professionalId ?? body.professional_id ?? null;
}

function recordScope(req, fallback = 'private') {
  return req.body?.scope === 'clinic' || req.query?.scope === 'clinic' ? 'clinic' : fallback;
}

async function resolveProfessionalFilter(context, requestedId, req) {
  const requested = requestedId || req.query?.professionalId || req.body?.professionalId || context.userId;
  return resolveProfessionalId(context, requested, 'agenda:read');
}

function appointmentBaseWhere(context, professionalId, scope) {
  if (scope === 'private') {
    return professionalId === context.userId || ['admin', 'superadmin'].includes(context.accountRole)
      ? { professionalId }
      : null;
  }
  const where = scopedWhere(context, 'agenda:read', 'clinic', {}, { clinicOrganizationFilter: false });
  if (!where) return null;
  if (!context.organizationId) return null;
  const professionalFilter = professionalId && professionalId !== 'all' ? professionalId : null;
  return {
    ...where,
    ...(professionalFilter ? { professionalId: professionalFilter } : {}),
    professional: { organizationId: context.organizationId },
  };
}

function normalizeAppointmentInput(body = {}, fallbackProfessionalId) {
  const raw = Object.fromEntries(
    Object.entries(body).map(([key, value]) => [key, value === '' ? null : value])
  );

  const professionalId =
    raw.professionalId === 'all' || raw.professional_id === 'all'
      ? fallbackProfessionalId
      : raw.professionalId ?? raw.professional_id ?? fallbackProfessionalId;

  const data = {
    type: raw.type,
    date: raw.date,
    time: raw.time,
    duration: raw.duration,
    value: raw.value,
    status: raw.status,
    paymentStatus: raw.paymentStatus ?? raw.payment_status,
    mode: raw.mode,
    attended: raw.attended,
    notes: raw.notes,
    patientId: raw.patientId ?? raw.patient_id,
    coupleId: raw.coupleId ?? raw.couple_id,
    professionalId,
  };

  if (data.date) {
    const parsedDate = new Date(
      String(data.date).includes('T') ? String(data.date) : `${String(data.date)}T00:00:00.000Z`
    );
    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Data inválida para a consulta');
    }
    data.date = parsedDate;
  }

  if (data.duration != null) {
    const duration = Number(data.duration);
    if (Number.isNaN(duration)) {
      throw new Error('Duração inválida');
    }
    data.duration = duration;
  }

  if (data.value != null) {
    const value = Number(data.value);
    if (Number.isNaN(value)) {
      throw new Error('Valor inválido');
    }
    data.value = value;
  }

  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function validateAppointmentPayload(data) {
  if (!data.type) return 'Tipo da consulta é obrigatório';
  if (!data.date) return 'Data da consulta é obrigatória';
  if (!data.time) return 'Horário da consulta é obrigatório';
  if (!data.professionalId) return 'Profissional da consulta é obrigatório';
  if (data.type === 'couple' && !data.coupleId) return 'Casal é obrigatório';
  if (data.type !== 'couple' && data.type !== 'blocked' && !data.patientId) return 'Paciente é obrigatório';
  return null;
}

function isOverlapping(time1, duration1, time2, duration2) {
  const [h1, m1] = time1.split(':').map(Number);
  const start1 = h1 * 60 + m1;
  const end1 = start1 + duration1;

  const [h2, m2] = time2.split(':').map(Number);
  const start2 = h2 * 60 + m2;
  const end2 = start2 + duration2;

  return start1 < end2 && start2 < end1;
}

async function findConflicts(professionalId, date, time, duration, excludeId = null) {
  const appointments = await prisma.appointment.findMany({
    where: {
      professionalId,
      date: new Date(date),
      status: { not: 'cancelled' },
      id: excludeId ? { not: excludeId } : undefined,
    },
  });

  return appointments.filter(apt => isOverlapping(time, duration, apt.time, apt.duration));
}

function generateRecurringDates(startDate, frequency, durationMonths) {
  const dates = [];
  let current = new Date(startDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);

  // We already have the first date from the original request
  // So we start from the next one
  const increment = frequency === 'weekly' ? 7 : 14;
  
  while (true) {
    // Add increment to current date
    current = new Date(current.getTime() + increment * 24 * 60 * 60 * 1000);
    if (current > endDate) break;
    dates.push(new Date(current));
  }
  return dates;
}

// GET /api/consultas
router.get('/', requireScope('private', 'clinic'), async (req, res) => {
  try {
    const { date, status, professional_id, startDate, endDate, patientId, coupleId } = req.query;
    const scope = recordScope(req, 'private');
    const professionalId = await resolveProfessionalId(req.access, professional_id, 'agenda:read');
    if (!professionalId) return res.status(403).json({ error: 'Profissional fora da organização ou sem permissão' });
    const where = appointmentBaseWhere(req.access, professionalId, scope);
    if (!where) return res.status(403).json({ error: 'Sem permissão para este escopo' });
    if (status) where.status = status;
    if (patientId) where.patientId = patientId;
    if (coupleId) where.coupleId = coupleId;

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
      where: { id: req.params.id },
      include: {
        professional: { select: { id: true, organizationId: true } },
      },
    });
    if (!appointment) return res.status(404).json({ error: 'Consulta não encontrada' });
    const allowed = appointment.scope === 'private'
      ? appointment.professionalId === req.access.userId || ['admin', 'superadmin'].includes(req.access.accountRole)
      : canAccessScope(req.access, 'agenda:read', appointment.scope)
        && (!req.access.organizationId || appointment.professional.organizationId === req.access.organizationId);
    if (!allowed) return res.status(404).json({ error: 'Consulta não encontrada' });
    const fullAppointment = await prisma.appointment.findFirst({
      where: { id: req.params.id },
      include: {
        patient: true,
        couple: { include: { patient1: true, patient2: true } },
        records: true,
        transcriptions: true
      }
    });
    if (!fullAppointment) return res.status(404).json({ error: 'Consulta não encontrada' });
    res.json(fullAppointment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar consulta' });
  }
});

// POST /api/consultas
router.post('/', requireScope('private', 'clinic'), async (req, res) => {
  try {
    const scope = recordScope(req, 'private');
    const professionalId = await resolveProfessionalId(req.access, req.body?.professionalId || req.body?.professional_id, 'agenda:manage');
    if (!professionalId) return res.status(403).json({ error: 'Profissional fora da organização ou sem permissão' });
    const data = normalizeAppointmentInput(req.body, professionalId);
    data.professionalId = professionalId;
    data.scope = scope;
    const validationError = validateAppointmentPayload(data);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { recurring, recurrenceFrequency, recurrenceDuration } = req.body;

    // Check conflict for the primary appointment
    const conflicts = await findConflicts(data.professionalId, data.date, data.time, data.duration);
    if (conflicts.length > 0) {
      return res.status(409).json({ 
        error: 'Conflito de agenda', 
        details: 'Já existe um agendamento para este horário.',
        conflicts 
      });
    }

    if (recurring && recurrenceFrequency && recurrenceDuration) {
      const durationMonths = recurrenceDuration === '2m' ? 2 : 1;
      const recurringDates = generateRecurringDates(data.date, recurrenceFrequency, durationMonths);
      
      const allConflicts = [];
      for (const rDate of recurringDates) {
        const dateStr = rDate.toISOString().split('T')[0];
        const c = await findConflicts(data.professionalId, dateStr, data.time, data.duration);
        if (c.length > 0) {
          allConflicts.push({ date: dateStr, conflicts: c });
        }
      }

      if (allConflicts.length > 0) {
        return res.status(409).json({ 
          error: 'Conflitos nas recorrências', 
          details: 'Algumas datas da recorrência possuem conflitos.',
          recurringConflicts: allConflicts 
        });
      }

      // Create all in a transaction
      const results = await prisma.$transaction(async (tx) => {
        const first = await tx.appointment.create({
          data,
          include: {
            patient: { select: { id: true, name: true } },
            couple: { select: { id: true, name: true } }
          }
        });

        const others = await Promise.all(recurringDates.map(rDate => 
          tx.appointment.create({
            data: { ...data, date: rDate },
            include: {
              patient: { select: { id: true, name: true } },
              couple: { select: { id: true, name: true } }
            }
          })
        ));

        return [first, ...others];
      });

      return res.status(201).json(results[0]); // Return the first one as usual
    }

    const appointment = await prisma.appointment.create({
      data,
      include: {
        patient: { select: { id: true, name: true } },
        couple: { select: { id: true, name: true } }
      }
    });
    await logAudit(req, 'appointment.created', 'Appointment', appointment.id, {
      scope: appointment.scope,
      professionalId: appointment.professionalId,
      patientId: appointment.patientId,
    });
    if (scope === 'clinic') {
      await notifyUsers(req.access.organizationId, [appointment.professionalId], 'agenda.created', 'Nova consulta da clínica', `Agendamento ${appointment.date?.toISOString?.().slice(0, 10) || ''} ${appointment.time || ''}`.trim(), {
        appointmentId: appointment.id,
        scope: 'clinic',
      });
    }
    res.status(201).json(appointment);
  } catch (err) {
    console.error('Erro ao criar consulta:', err);
    res.status(500).json({ error: 'Erro ao criar consulta', details: err.message });
  }
});

// PUT /api/consultas/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.appointment.findFirst({
      where: { id: req.params.id },
      include: { professional: { select: { organizationId: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Consulta não encontrada' });
    const allowed = existing.scope === 'private'
      ? existing.professionalId === req.access.userId || ['admin', 'superadmin'].includes(req.access.accountRole)
      : canAccessScope(req.access, 'agenda:manage', existing.scope)
        && (!req.access.organizationId || existing.professional.organizationId === req.access.organizationId);
    if (!allowed) return res.status(404).json({ error: 'Consulta não encontrada' });
    const professionalId = await resolveProfessionalId(req.access, dataRequestProfessionalId(req.body), 'agenda:manage');
    if (!professionalId) return res.status(403).json({ error: 'Profissional fora da organização ou sem permissão' });
    const data = normalizeAppointmentInput(req.body, existing.professionalId);
    delete data.professionalId;
    if (req.body?.scope && req.body.scope !== existing.scope) {
      return res.status(400).json({ error: 'O escopo de uma consulta não pode ser alterado' });
    }
    const validationError = validateAppointmentPayload({ ...data, professionalId: existing.professionalId, type: data.type || 'individual' });
    if (validationError && validationError !== 'Paciente é obrigatório') {
      return res.status(400).json({ error: validationError });
    }

    // Check conflict (excluding current appointment)
    if (data.date && data.time && data.duration) {
      const conflicts = await findConflicts(existing.professionalId, data.date, data.time, data.duration, req.params.id);
      if (conflicts.length > 0) {
        return res.status(409).json({
          error: 'Conflito de agenda',
          details: 'Já existe um agendamento para este horário.',
          conflicts
        });
      }
    }

    const appointment = await prisma.appointment.updateMany({
      where: { id: req.params.id },
      data
    });
    if (appointment.count === 0) return res.status(404).json({ error: 'Consulta não encontrada' });
    const updated = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: {
        patient: { select: { id: true, name: true } },
        couple: { select: { id: true, name: true } }
      }
    });
    res.json(updated);
  } catch (err) {
    console.error('Erro ao atualizar consulta:', err);
    res.status(500).json({ error: 'Erro ao atualizar consulta', details: err.message });
  }
});

async function assertAppointmentOwnership(context, id, capability) {
  const appointment = await prisma.appointment.findFirst({
    where: { id },
    include: { professional: { select: { organizationId: true } } },
  });
  if (!appointment) return null;
  const allowed = appointment.scope === 'private'
    ? appointment.professionalId === context.userId || ['admin', 'superadmin'].includes(context.accountRole)
    : canAccessScope(context, capability || 'agenda:manage', appointment.scope)
      && (!context.organizationId || appointment.professional.organizationId === context.organizationId);
  return allowed ? appointment : null;
}

// POST /api/consultas/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  try {
    const existing = await assertAppointmentOwnership(req.access, req.params.id, 'agenda:manage');
    if (!existing) return res.status(404).json({ error: 'Consulta não encontrada' });
    await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'cancelled', attended: false },
    });
    await removeAppointmentReceivable(existing, existing.professionalId);
    await logAudit(req, 'appointment.cancelled', 'Appointment', req.params.id, { scope: existing.scope });
    res.json({ message: 'Consulta cancelada' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao cancelar consulta' });
  }
});

async function ensureAppointmentReceivable(appointment, professionalId) {
  const fullAppointment = appointment.patient
    ? appointment
    : await prisma.appointment.findFirst({
        where: { id: appointment.id },
        include: {
          patient: true,
          professional: { select: { organizationId: true } },
        },
      });
  if (!fullAppointment) return null;
  return ensureReceivableForAppointment(fullAppointment, professionalId, prisma);
}

async function removeAppointmentReceivable(appointment, professionalId) {
  const fullAppointment = appointment.patient
    ? appointment
    : await prisma.appointment.findFirst({
        where: { id: appointment.id },
        include: { patient: true },
      });
  const value = fullAppointment?.patient
    ? sessionBillingValue(fullAppointment, fullAppointment.patient)
    : (appointment.value ? Number(appointment.value) : 0);
  await removeReceivableForAppointment(appointment.id, professionalId, value, prisma);
}

// POST /api/consultas/:id/attend - mark attendance and auto-create receivable
router.post('/:id/attend', async (req, res) => {
  try {
    const apt = await assertAppointmentOwnership(req.access, req.params.id, 'agenda:manage');
    if (!apt) return res.status(404).json({ error: 'Consulta não encontrada' });
    const fullApt = await prisma.appointment.findFirst({
      where: { id: req.params.id },
      include: { patient: true },
    });

    await prisma.appointment.update({
      where: { id: req.params.id },
      data: { attended: true, status: 'completed' }
    });

    const account = await ensureAppointmentReceivable(fullApt, fullApt.professionalId);
    await logAudit(req, 'appointment.attended', 'Appointment', req.params.id, { scope: fullApt.scope });
    res.json({
      message: account
        ? 'Comparecimento registrado e cobrança gerada'
        : 'Comparecimento registrado',
      receivableCreated: !!account,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar comparecimento', details: err.message });
  }
});

// POST /api/consultas/:id/miss - mark as no-show, optionally charging the session
router.post('/:id/miss', async (req, res) => {
  try {
    const charge = req.body?.charge !== false; // default true
    const apt = await assertAppointmentOwnership(req.access, req.params.id, 'agenda:manage');
    if (!apt) return res.status(404).json({ error: 'Consulta não encontrada' });

    await prisma.appointment.update({
      where: { id: req.params.id },
      data: {
        attended: false,
        status: charge ? 'missed_charged' : 'missed_free',
      },
    });

    let account = null;
    if (charge) {
      const fullApt = await prisma.appointment.findFirst({ where: { id: req.params.id }, include: { patient: true } });
      account = await ensureAppointmentReceivable(fullApt, fullApt.professionalId);
    } else {
      await removeAppointmentReceivable(apt, apt.professionalId);
    }
    await logAudit(req, 'appointment.missed', 'Appointment', req.params.id, { scope: apt.scope, charge });

    res.json({
      message: charge ? 'Falta registrada com cobrança' : 'Falta registrada sem cobrança',
      receivableCreated: !!account,
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar falta', details: err.message });
  }
});

// POST /api/consultas/:id/reset-status - back to scheduled / pending
router.post('/:id/reset-status', async (req, res) => {
  try {
    const apt = await assertAppointmentOwnership(req.access, req.params.id, 'agenda:manage');
    if (!apt) return res.status(404).json({ error: 'Consulta não encontrada' });
    await prisma.appointment.update({
      where: { id: apt.id },
      data: { attended: false, status: 'scheduled' },
    });
    await removeAppointmentReceivable(apt, apt.professionalId);
    res.json({ message: 'Status revertido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reverter status', details: err.message });
  }
});

// GET /api/consultas/sessions-by-patient?month=YYYY-MM
// Returns patients grouped with their sessions in the month + status
router.get('/sessions-by-patient/list', requireScope('private', 'clinic'), async (req, res) => {
  try {
    const { month } = req.query;
    const scope = recordScope(req, 'private');
    const professionalId = await resolveProfessionalId(req.access, req.query?.professionalId || req.query?.professional_id, 'agenda:read');
    if (!professionalId) return res.status(403).json({ error: 'Profissional fora da organização ou sem permissão' });
    const scopeWhere = appointmentBaseWhere(req.access, professionalId, scope);
    if (!scopeWhere) return res.status(403).json({ error: 'Sem permissão para este escopo' });
    const now = new Date();
    const [y, m] = month
      ? month.split('-').map(Number)
      : [now.getFullYear(), now.getMonth() + 1];
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const appointments = await prisma.appointment.findMany({
      where: {
        ...scopeWhere,
        date: { gte: start, lte: end },
        type: { not: 'blocked' },
      },
      include: {
        patient: { select: { id: true, name: true, sessionValue: true, billingMode: true } },
        couple: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    // Map appointment -> linked receivable status (if any)
    const apptIds = appointments.map(a => a.id);
    const accounts = apptIds.length
      ? await prisma.account.findMany({
          where: {
            professionalId,
            type: 'receivable',
            OR: apptIds.map(id => ({ notes: { contains: `appointment_id:${id}` } })),
          },
          select: { id: true, status: true, notes: true, value: true, paidAt: true },
        })
      : [];

    const acctByAppt = {};
    accounts.forEach(a => {
      const m = a.notes && a.notes.match(/appointment_id:([a-f0-9-]+)/);
      if (m) acctByAppt[m[1]] = a;
    });

    // Group by patient/couple
    const groups = {};
    for (const apt of appointments) {
      const key = apt.patientId || apt.coupleId || 'unknown';
      if (!groups[key]) {
        groups[key] = {
          id: key,
          name: apt.patient?.name || apt.couple?.name || 'Sem paciente',
          billingMode: apt.patient?.billingMode || 'per_session',
          sessionValue: apt.patient?.sessionValue ? Number(apt.patient.sessionValue) : null,
          sessions: [],
          totals: { attended: 0, missed: 0, pending: 0, totalValue: 0, paidValue: 0, dueValue: 0 },
        };
      }
      const acct = acctByAppt[apt.id] || null;
      const value = apt.value
        ? Number(apt.value)
        : (apt.patient?.sessionValue ? Number(apt.patient.sessionValue) : 0);
      const session = {
        id: apt.id,
        date: apt.date,
        time: apt.time,
        duration: apt.duration,
        type: apt.type,
        mode: apt.mode,
        status: apt.status, // scheduled, completed, missed_charged, missed_free, cancelled
        attended: apt.attended,
        value,
        accountId: acct?.id || null,
        accountStatus: acct?.status || null,
        accountPaidAt: acct?.paidAt || null,
      };
      groups[key].sessions.push(session);
      if (apt.attended) groups[key].totals.attended += 1;
      else if (apt.status === 'missed_charged' || apt.status === 'missed_free') groups[key].totals.missed += 1;
      else groups[key].totals.pending += 1;
      if (acct) {
        groups[key].totals.totalValue += Number(acct.value);
        if (acct.status === 'paid') groups[key].totals.paidValue += Number(acct.value);
        else groups[key].totals.dueValue += Number(acct.value);
      }
    }

    res.json({
      month: `${y}-${String(m).padStart(2, '0')}`,
      patients: Object.values(groups).sort((a, b) => a.name.localeCompare(b.name)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar sessões por paciente', details: err.message });
  }
});

// POST /api/consultas/:id/approve - approve a pending_approval appointment
router.post('/:id/approve', async (req, res) => {
  try {
    const apt = await assertAppointmentOwnership(req.access, req.params.id, 'agenda:manage');
    if (!apt || apt.status !== 'pending_approval') return res.status(404).json({ error: 'Consulta não encontrada ou já aprovada' });
    const updated = await prisma.appointment.update({
      where: { id: apt.id },
      data: { status: 'scheduled' }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar consulta', details: err.message });
  }
});

// POST /api/consultas/:id/reject - reject a pending_approval appointment
router.post('/:id/reject', async (req, res) => {
  try {
    const apt = await prisma.appointment.findFirst({ where: { id: req.params.id } });
    if (!apt) return res.status(404).json({ error: 'Consulta não encontrada' });
    const owned = await assertAppointmentOwnership(req.access, req.params.id, 'agenda:manage');
    if (!owned || apt.status !== 'pending_approval') return res.status(404).json({ error: 'Consulta não encontrada' });
    const updated = await prisma.appointment.update({
      where: { id: apt.id },
      data: { status: 'cancelled', notes: (apt.notes ? apt.notes + ' | ' : '') + 'Rejeitado pelo profissional' }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao rejeitar consulta', details: err.message });
  }
});

module.exports = router;
