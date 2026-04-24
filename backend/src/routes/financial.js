const express = require('express');

const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);

// GET /api/financeiro
router.get('/', async (req, res) => {
  try {
    const { status, month } = req.query;
    const where = {};

    // Filter by appointments owned by this professional
    where.appointment = { professionalId: req.userId };
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
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const payments = await prisma.payment.findMany({
      where: {
        appointment: { professionalId: req.userId },
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
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        paidAt: req.body.status === 'paid' ? new Date() : null
      }
    });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar pagamento' });
  }
});

module.exports = router;
