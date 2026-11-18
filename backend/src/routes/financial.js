const express = require('express');

const { authMiddleware } = require('../middleware/auth');
const { loadAccess, requireScope } = require('../middleware/access');
const { canAccessScope } = require('../permissions');
const { logAudit } = require('../services/auditService');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);
router.use(loadAccess);

function paymentScopeWhere(context, scope) {
  if (!canAccessScope(context, 'finance:read', scope)) return null;
  if (scope === 'private') {
    if (['admin', 'superadmin', 'financial'].includes(context.accountRole)) {
      return { professional: { organizationId: context.organizationId } };
    }
    return { appointment: { professionalId: context.userId } };
  }
  if (!context.organizationId) return null;
  return { scope, professional: { organizationId: context.organizationId } };
}

// GET /api/financeiro
router.get('/', requireScope('private', 'clinic'), async (req, res) => {
  try {
    const { status } = req.query;
    const scope = req.query?.scope === 'clinic' ? 'clinic' : 'private';
    const ownership = paymentScopeWhere(req.access, scope);
    if (!ownership) return res.status(403).json({ error: 'Sem permissão para este escopo' });
    const where = { ...ownership, scope };
    if (status) where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        appointment: { select: { id: true, date: true, type: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar pagamentos', details: err.message });
  }
});

// GET /api/financeiro/summary
router.get('/summary', requireScope('private', 'clinic'), async (req, res) => {
  try {
    const scope = req.query?.scope === 'clinic' ? 'clinic' : 'private';
    const ownership = paymentScopeWhere(req.access, scope);
    if (!ownership) return res.status(403).json({ error: 'Sem permissão para este escopo' });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const payments = await prisma.payment.findMany({
      where: {
        ...ownership,
        scope,
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    const total = payments.reduce((sum, p) => sum + Number(p.value), 0);
    const received = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.value), 0);
    const pending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + Number(p.value), 0);

    res.json({
      month: now.toISOString().slice(0, 7),
      total,
      received,
      pending,
      count: payments.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar resumo financeiro' });
  }
});

// PUT /api/financeiro/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.payment.findFirst({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Pagamento não encontrado' });
    if (!canAccessScope(req.access, 'finance:manage', existing.scope || 'private')) {
      return res.status(403).json({ error: 'Sem permissão para este escopo' });
    }
    if (existing.scope === 'private' && existing.professionalId !== req.access.userId && !['admin', 'superadmin', 'financial'].includes(req.access.accountRole)) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    if (existing.scope === 'clinic' && !req.access.organizationId) {
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        scope: existing.scope,
        professionalId: existing.professionalId,
        paidAt: req.body.status === 'paid' ? new Date() : null
      }
    });
    await logAudit(req, 'payment.updated', 'Payment', payment.id, { scope: payment.scope, status: payment.status });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
});

module.exports = router;
