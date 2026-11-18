const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { loadAccess, requireCapability, requireClinicMember, requireScope } = require('../middleware/access');
const { canAccessScope } = require('../permissions');
const { logAudit } = require('../services/auditService');
const { notifyUsers } = require('../services/notificationService');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);
router.use(loadAccess);
router.use(requireClinicMember);

function monthBounds(month) {
  const year = Number(month.slice(0, 4));
  const mon = Number(month.slice(5, 7)) - 1;
  if (!year || Number.isNaN(mon) || mon < 0 || mon > 11) return null;
  return {
    monthDate: new Date(Date.UTC(year, mon, 1)),
    start: new Date(Date.UTC(year, mon, 1)),
    end: new Date(Date.UTC(year, mon + 1, 0, 23, 59, 59)),
  };
}

async function activeAgreement(organizationId, professionalId, sessionDate) {
  const agreements = await prisma.compensationAgreement.findMany({
    where: {
      organizationId,
      professionalId,
      isActive: true,
      effectiveFrom: { lte: sessionDate },
      OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: sessionDate } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  });
  return agreements[0] || null;
}

function calculatePayout(chargedAmount, agreement) {
  const charged = Number(chargedAmount || 0);
  if (!agreement) {
    return { grossAmount: 0, deductionAmount: charged, netAmount: 0, ruleType: 'none', fixedAmount: null, percentage: null };
  }
  let gross = 0;
  if (agreement.ruleType === 'fixed') gross = Number(agreement.fixedAmount || 0);
  else if (agreement.ruleType === 'percent') gross = (charged * Number(agreement.percentage || 0)) / 100;
  else gross = Number(agreement.fixedAmount || 0) + (charged * Number(agreement.percentage || 0)) / 100;
  gross = Math.min(gross, charged);
  const deduction = Math.max(charged - gross, 0);
  return {
    grossAmount: Number(gross.toFixed(2)),
    deductionAmount: Number(deduction.toFixed(2)),
    netAmount: Number(gross.toFixed(2)),
    ruleType: agreement.ruleType,
    fixedAmount: agreement.fixedAmount ? Number(agreement.fixedAmount) : null,
    percentage: agreement.percentage ? Number(agreement.percentage) : null,
  };
}

// POST /api/payouts/agreements - define acordo de remuneração com vigência
router.post('/agreements', requireCapability('payout:manage'), async (req, res) => {
  try {
    const { professionalId, ruleType, fixedAmount, percentage, effectiveFrom, effectiveUntil, notes } = req.body || {};
    if (!professionalId || !ruleType || !effectiveFrom) {
      return res.status(400).json({ error: 'professionalId, ruleType e effectiveFrom são obrigatórios' });
    }
    if (!['fixed', 'percent', 'both'].includes(ruleType)) {
      return res.status(400).json({ error: 'ruleType inválido' });
    }
    const member = await prisma.clinicMember.findFirst({
      where: { organizationId: req.access.organizationId, userId: professionalId, status: 'active' },
      select: { id: true },
    });
    if (!member) return res.status(404).json({ error: 'Profissional sem vínculo ativo na clínica' });

    const agreement = await prisma.compensationAgreement.create({
      data: {
        organizationId: req.access.organizationId,
        professionalId,
        ruleType,
        fixedAmount: fixedAmount != null ? Number(fixedAmount) : null,
        percentage: percentage != null ? Number(percentage) : null,
        effectiveFrom: new Date(effectiveFrom),
        effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
        notes: notes || null,
        createdBy: req.access.userId,
      },
    });
    await logAudit(req, 'payout.agreement_created', 'CompensationAgreement', agreement.id, { professionalId, ruleType });
    res.status(201).json(agreement);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar acordo de repasse', details: err.message });
  }
});

// GET /api/payouts/agreements - lista acordos vigentes ou históricos
router.get('/agreements', requireScope('private', 'clinic'), async (req, res) => {
  try {
    if (!canAccessScope(req.access, 'payout:manage', 'clinic') && req.access.role !== 'professional') {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    const where = { organizationId: req.access.organizationId };
    if (req.access.role === 'professional') where.professionalId = req.access.userId;
    if (req.query.professionalId && canAccessScope(req.access, 'payout:manage', 'clinic')) {
      where.professionalId = req.query.professionalId;
    }
    const agreements = await prisma.compensationAgreement.findMany({
      where,
      include: { professional: { select: { id: true, name: true, email: true } } },
      orderBy: { effectiveFrom: 'desc' },
    });
    res.json(agreements);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar acordos', details: err.message });
  }
});

// POST /api/payouts/runs - gera prévia do fechamento mensal da clínica
router.post('/runs', requireCapability('payout:manage'), async (req, res) => {
  try {
    const { month } = req.body || {};
    const bounds = month ? monthBounds(month) : null;
    if (!bounds) return res.status(400).json({ error: 'month deve usar o formato YYYY-MM' });

    const existing = await prisma.payoutRun.findUnique({
      where: { organizationId_month: { organizationId: req.access.organizationId, month: bounds.monthDate } },
    });
    if (existing && ['approved', 'paid'].includes(existing.status)) {
      return res.status(409).json({ error: 'Fechamento aprovado/pago não pode ser recalculado' });
    }

    const sessions = await prisma.appointment.findMany({
      where: {
        scope: 'clinic',
        attended: true,
        status: 'completed',
        date: { gte: bounds.start, lte: bounds.end },
        professional: { organizationId: req.access.organizationId },
        paymentStatus: 'paid',
      },
      include: { patient: { select: { id: true, name: true } } },
    });

    const run = await prisma.$transaction(async (tx) => {
      const created = existing
        ? await tx.payoutRun.update({ where: { id: existing.id }, data: { status: 'draft', notes: req.body?.notes || existing.notes } })
        : await tx.payoutRun.create({
          data: {
            organizationId: req.access.organizationId,
            month: bounds.monthDate,
            status: 'draft',
            notes: req.body?.notes || null,
          },
        });
      if (existing) await tx.payoutItem.deleteMany({ where: { runId: existing.id } });

      let grossTotal = 0;
      let deductionTotal = 0;
      let netTotal = 0;
      for (const session of sessions) {
        const agreement = await activeAgreement(req.access.organizationId, session.professionalId, session.date);
        const charged = Number(session.value || session.patientValue || 0);
        const calc = calculatePayout(charged, agreement);
        grossTotal += calc.grossAmount;
        deductionTotal += calc.deductionAmount;
        netTotal += calc.netAmount;
        await tx.payoutItem.create({
          data: {
            runId: created.id,
            organizationId: req.access.organizationId,
            professionalId: session.professionalId,
            appointmentId: session.id,
            patientId: session.patientId,
            sessionDate: session.date,
            chargedAmount: charged,
            agreementId: agreement?.id || null,
            ruleType: calc.ruleType,
            fixedAmount: calc.fixedAmount,
            percentage: calc.percentage,
            grossAmount: calc.grossAmount,
            deductionAmount: calc.deductionAmount,
            netAmount: calc.netAmount,
            status: 'pending',
          },
        });
      }

      return tx.payoutRun.update({
        where: { id: created.id },
        data: { grossTotal, deductionTotal, netTotal },
        include: { items: { include: { professional: { select: { id: true, name: true } } } } },
      });
    });

    await logAudit(req, 'payout.run_generated', 'PayoutRun', run.id, { month, sessions: sessions.length });
    res.status(201).json(run);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar fechamento', details: err.message });
  }
});

// GET /api/payouts/runs - lista fechamentos
router.get('/runs', async (req, res) => {
  try {
    if (!canAccessScope(req.access, 'payout:manage', 'clinic') && req.access.role !== 'professional') {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    const runs = await prisma.payoutRun.findMany({
      where: { organizationId: req.access.organizationId },
      orderBy: { month: 'desc' },
      include: {
        items: req.access.role === 'professional'
          ? { where: { professionalId: req.access.userId }, include: { professional: { select: { id: true, name: true } } } }
          : { include: { professional: { select: { id: true, name: true } } } },
      },
    });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar fechamentos', details: err.message });
  }
});

// GET /api/payouts/runs/:id - detalhe do fechamento
router.get('/runs/:id', async (req, res) => {
  try {
    const run = await prisma.payoutRun.findFirst({
      where: { id: req.params.id, organizationId: req.access.organizationId },
      include: { items: { include: { professional: { select: { id: true, name: true } } } } },
    });
    if (!run) return res.status(404).json({ error: 'Fechamento não encontrado' });
    if (req.access.role === 'professional' && !canAccessScope(req.access, 'payout:manage', 'clinic')) {
      run.items = run.items.filter((item) => item.professionalId === req.access.userId);
    }
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar fechamento', details: err.message });
  }
});

// POST /api/payouts/runs/:id/review - marca como revisado
router.post('/runs/:id/review', requireCapability('payout:manage'), async (req, res) => {
  try {
    const run = await prisma.payoutRun.findFirst({
      where: { id: req.params.id, organizationId: req.access.organizationId },
    });
    if (!run) return res.status(404).json({ error: 'Fechamento não encontrado' });
    if (!['draft'].includes(run.status)) return res.status(409).json({ error: 'Somente rascunhos podem ser revisados' });
    const updated = await prisma.payoutRun.update({
      where: { id: run.id },
      data: { status: 'review', reviewedAt: new Date() },
    });
    await logAudit(req, 'payout.run_reviewed', 'PayoutRun', run.id, { month: run.month });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao revisar fechamento', details: err.message });
  }
});

// POST /api/payouts/runs/:id/approve - aprova e bloqueia o fechamento
router.post('/runs/:id/approve', requireCapability('payout:manage'), async (req, res) => {
  try {
    const run = await prisma.payoutRun.findFirst({
      where: { id: req.params.id, organizationId: req.access.organizationId },
      include: { items: true },
    });
    if (!run) return res.status(404).json({ error: 'Fechamento não encontrado' });
    if (!['draft', 'review'].includes(run.status)) return res.status(409).json({ error: 'Fechamento já aprovado/pago' });

    const totals = run.items.reduce((acc, item) => ({
      grossTotal: acc.grossTotal + Number(item.grossAmount),
      deductionTotal: acc.deductionTotal + Number(item.deductionAmount),
      netTotal: acc.netTotal + Number(item.netAmount),
    }), { grossTotal: 0, deductionTotal: 0, netTotal: 0 });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payoutItem.updateMany({ where: { runId: run.id }, data: { status: 'approved' } });
      return tx.payoutRun.update({
        where: { id: run.id },
        data: {
          ...totals,
          status: 'approved',
          approvedAt: new Date(),
          approvedById: req.access.userId,
        },
      });
    });
    await logAudit(req, 'payout.run_approved', 'PayoutRun', run.id, totals);
    const professionals = [...new Set(run.items.map((item) => item.professionalId))];
    await notifyUsers(req.access.organizationId, professionals, 'payout.approved', 'Fechamento aprovado', `Repasse de ${run.month.toISOString().slice(0, 7)} aprovado.`, { runId: run.id });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aprovar fechamento', details: err.message });
  }
});

// POST /api/payouts/runs/:id/pay - registra pagamento dos repasses
router.post('/runs/:id/pay', requireCapability('payout:manage'), async (req, res) => {
  try {
    const run = await prisma.payoutRun.findFirst({
      where: { id: req.params.id, organizationId: req.access.organizationId },
    });
    if (!run) return res.status(404).json({ error: 'Fechamento não encontrado' });
    if (run.status !== 'approved') return res.status(409).json({ error: 'Somente fechamentos aprovados podem ser pagos' });
    const updated = await prisma.$transaction(async (tx) => {
      await tx.payoutItem.updateMany({ where: { runId: run.id }, data: { status: 'paid', paidAt: new Date() } });
      return tx.payoutRun.update({
        where: { id: run.id },
        data: { status: 'paid', paidAt: new Date(), paidById: req.access.userId },
      });
    });
    await logAudit(req, 'payout.run_paid', 'PayoutRun', run.id, { month: run.month });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar pagamento', details: err.message });
  }
});

// PATCH /api/payouts/items/:id - ajuste manual com justificativa antes da aprovação
router.patch('/items/:id', requireCapability('payout:manage'), async (req, res) => {
  try {
    const item = await prisma.payoutItem.findFirst({
      where: { id: req.params.id, organizationId: req.access.organizationId },
      include: { run: true },
    });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });
    if (['approved', 'paid'].includes(item.run.status)) {
      return res.status(409).json({ error: 'Fechamento aprovado/pago não pode ser alterado' });
    }
    const { netAmount, adjustmentReason } = req.body || {};
    if (netAmount == null || !adjustmentReason) {
      return res.status(400).json({ error: 'netAmount e adjustmentReason são obrigatórios' });
    }
    const updated = await prisma.payoutItem.update({
      where: { id: item.id },
      data: { netAmount: Number(netAmount), adjustmentReason, status: 'adjusted' },
    });
    await logAudit(req, 'payout.item_adjusted', 'PayoutItem', item.id, { netAmount, adjustmentReason });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ajustar item', details: err.message });
  }
});

module.exports = router;
