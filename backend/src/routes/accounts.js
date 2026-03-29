const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/accounts - list accounts (contas a pagar/receber)
router.get('/', async (req, res) => {
  try {
    const { type, status, category, startDate, endDate, page = 1, limit = 50 } = req.query;
    const where = { professionalId: req.userId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (category) where.category = category;
    if (startDate || endDate) {
      where.dueDate = {};
      if (startDate) where.dueDate.gte = new Date(startDate);
      if (endDate) where.dueDate.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      prisma.account.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { patient: { select: { id: true, name: true } } }
      }),
      prisma.account.count({ where })
    ]);

    res.json({ data, total });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar contas', details: err.message });
  }
});

// GET /api/accounts/summary - financial summary
router.get('/summary', async (req, res) => {
  try {
    const { month } = req.query;
    const now = new Date();
    const year = month ? parseInt(month.split('-')[0]) : now.getFullYear();
    const mon = month ? parseInt(month.split('-')[1]) - 1 : now.getMonth();
    const start = new Date(year, mon, 1);
    const end = new Date(year, mon + 1, 0);

    const accounts = await prisma.account.findMany({
      where: {
        professionalId: req.userId,
        dueDate: { gte: start, lte: end }
      }
    });

    const receivable = accounts.filter(a => a.type === 'receivable');
    const payable = accounts.filter(a => a.type === 'payable');

    const totalReceivable = receivable.reduce((s, a) => s + Number(a.value), 0);
    const totalPayable = payable.reduce((s, a) => s + Number(a.value), 0);
    const receivedAmount = receivable.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.value), 0);
    const paidAmount = payable.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.value), 0);
    const pendingReceivable = receivable.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.value), 0);
    const pendingPayable = payable.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.value), 0);
    const overdueReceivable = receivable.filter(a => a.status === 'overdue').reduce((s, a) => s + Number(a.value), 0);

    res.json({
      totalReceivable,
      totalPayable,
      receivedAmount,
      paidAmount,
      pendingReceivable,
      pendingPayable,
      overdueReceivable,
      cashFlow: receivedAmount - paidAmount,
      balance: totalReceivable - totalPayable
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao calcular resumo' });
  }
});

// POST /api/accounts
router.post('/', async (req, res) => {
  try {
    const { type, description, value, dueDate, category, patientId, paymentMethod, notes, recurrence } = req.body;
    if (!type || !description || !value || !dueDate) {
      return res.status(400).json({ error: 'Tipo, descrição, valor e vencimento são obrigatórios' });
    }

    const account = await prisma.account.create({
      data: {
        professionalId: req.userId,
        type,
        description,
        value: parseFloat(value),
        dueDate: new Date(dueDate),
        category,
        patientId,
        paymentMethod,
        notes,
        recurrence
      },
      include: { patient: { select: { id: true, name: true } } }
    });

    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar conta', details: err.message });
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res) => {
  try {
    const existing = await prisma.account.findFirst({
      where: { id: req.params.id, professionalId: req.userId }
    });
    if (!existing) return res.status(404).json({ error: 'Conta não encontrada' });

    const data = {};
    const { description, value, dueDate, status, category, paymentMethod, notes, paidAt } = req.body;
    if (description !== undefined) data.description = description;
    if (value !== undefined) data.value = parseFloat(value);
    if (dueDate !== undefined) data.dueDate = new Date(dueDate);
    if (status !== undefined) data.status = status;
    if (category !== undefined) data.category = category;
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
    if (notes !== undefined) data.notes = notes;
    if (paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null;
    if (status === 'paid' && !data.paidAt) data.paidAt = new Date();

    const account = await prisma.account.update({
      where: { id: req.params.id },
      data,
      include: { patient: { select: { id: true, name: true } } }
    });

    res.json(account);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar conta', details: err.message });
  }
});

// DELETE /api/accounts/:id
router.delete('/:id', async (req, res) => {
  try {
    await prisma.account.deleteMany({
      where: { id: req.params.id, professionalId: req.userId }
    });
    res.json({ message: 'Conta removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover conta' });
  }
});

module.exports = router;
