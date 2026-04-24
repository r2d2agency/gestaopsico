const express = require('express');

const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);

// GET /api/invoices/patient-sessions/:patientId - get attended sessions for a patient in a period
router.get('/patient-sessions/:patientId', async (req, res) => {
  try {
    const { startDate, endDate, unbilledOnly } = req.query;
    const where = {
      professionalId: req.userId,
      patientId: req.params.patientId,
      attended: true,
      status: 'completed'
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // If unbilledOnly, exclude sessions that already have a linked account with invoiceRef
    const sessions = await prisma.appointment.findMany({
      where,
      include: { patient: { select: { id: true, name: true, sessionValue: true, billingMode: true } } },
      orderBy: { date: 'asc' }
    });

    // If unbilledOnly, filter out sessions that have an account referencing them
    let result = sessions;
    if (unbilledOnly === 'true') {
      const accountNotes = await prisma.account.findMany({
        where: { professionalId: req.userId, patientId: req.params.patientId },
        select: { notes: true }
      });
      const billedSessionIds = new Set();
      accountNotes.forEach(a => {
        if (a.notes) {
          const match = a.notes.match(/session_ids:([a-f0-9,\-]+)/);
          if (match) match[1].split(',').forEach(id => billedSessionIds.add(id));
        }
      });
      result = sessions.filter(s => !billedSessionIds.has(s.id));
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar sessões', details: err.message });
  }
});

// POST /api/invoices/generate - group sessions into an invoice (account receivable)
router.post('/generate', async (req, res) => {
  try {
    const { patientId, sessionIds, description, dueDate, paymentMethod } = req.body;
    if (!patientId || !sessionIds || !sessionIds.length) {
      return res.status(400).json({ error: 'patientId e sessionIds são obrigatórios' });
    }

    const sessions = await prisma.appointment.findMany({
      where: { id: { in: sessionIds }, professionalId: req.userId, patientId },
      include: { patient: { select: { name: true, sessionValue: true } } },
      orderBy: { date: 'asc' }
    });

    if (!sessions.length) return res.status(404).json({ error: 'Nenhuma sessão encontrada' });

    const totalValue = sessions.reduce((sum, s) => {
      const val = s.patient?.sessionValue ? Number(s.patient.sessionValue) : (s.value ? Number(s.value) : 0);
      return sum + val;
    }, 0);

    const account = await prisma.account.create({
      data: {
        professionalId: req.userId,
        type: 'receivable',
        description: description || `Fatura - ${sessions[0].patient?.name} (${sessions.length} sessões)`,
        value: totalValue,
        dueDate: dueDate ? new Date(dueDate) : new Date(),
        category: 'Consulta',
        patientId,
        paymentMethod: paymentMethod || null,
        status: 'pending',
        notes: `session_ids:${sessionIds.join(',')}`
      },
      include: { patient: { select: { id: true, name: true } } }
    });

    res.status(201).json({
      account,
      sessions: sessions.map(s => ({
        id: s.id,
        date: s.date,
        type: s.type,
        value: s.patient?.sessionValue ? Number(s.patient.sessionValue) : (s.value ? Number(s.value) : 0),
        duration: s.duration
      })),
      totalValue
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar fatura', details: err.message });
  }
});

// GET /api/invoices/monthly-report - monthly revenue, future revenue, expenses
router.get('/monthly-report', async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const now = new Date();
    const year = month ? parseInt(month.split('-')[0]) : now.getFullYear();
    const mon = month ? parseInt(month.split('-')[1]) - 1 : now.getMonth();
    const start = new Date(year, mon, 1);
    const end = new Date(year, mon + 1, 0, 23, 59, 59);

    // Current month accounts
    const accounts = await prisma.account.findMany({
      where: { professionalId: req.userId, dueDate: { gte: start, lte: end } },
      include: { patient: { select: { id: true, name: true } } }
    });

    // Future months (next 3 months)
    const futureStart = new Date(year, mon + 1, 1);
    const futureEnd = new Date(year, mon + 4, 0);
    const futureAccounts = await prisma.account.findMany({
      where: { professionalId: req.userId, dueDate: { gte: futureStart, lte: futureEnd } }
    });

    // Sessions this month (attended)
    const sessions = await prisma.appointment.findMany({
      where: {
        professionalId: req.userId,
        date: { gte: start, lte: end },
        attended: true,
        status: 'completed'
      },
      include: { patient: { select: { id: true, name: true, sessionValue: true, billingMode: true } } }
    });

    // Monthly patients: sum sessions per patient
    const monthlyPatients = {};
    sessions.forEach(s => {
      if (!s.patientId) return;
      if (!monthlyPatients[s.patientId]) {
        monthlyPatients[s.patientId] = {
          patientId: s.patientId,
          patientName: s.patient?.name || 'Sem nome',
          billingMode: s.patient?.billingMode || 'per_session',
          sessions: [],
          totalValue: 0
        };
      }
      const val = s.patient?.sessionValue ? Number(s.patient.sessionValue) : (s.value ? Number(s.value) : 0);
      monthlyPatients[s.patientId].sessions.push({
        id: s.id, date: s.date, value: val, duration: s.duration, type: s.type
      });
      monthlyPatients[s.patientId].totalValue += val;
    });

    const receivables = accounts.filter(a => a.type === 'receivable');
    const payables = accounts.filter(a => a.type === 'payable');

    const revenueReceived = receivables.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.value), 0);
    const revenuePending = receivables.filter(a => a.status === 'pending').reduce((s, a) => s + Number(a.value), 0);
    const revenueOverdue = receivables.filter(a => a.status === 'overdue').reduce((s, a) => s + Number(a.value), 0);
    const totalExpenses = payables.reduce((s, a) => s + Number(a.value), 0);
    const expensesPaid = payables.filter(a => a.status === 'paid').reduce((s, a) => s + Number(a.value), 0);
    const futureRevenue = futureAccounts.filter(a => a.type === 'receivable').reduce((s, a) => s + Number(a.value), 0);

    res.json({
      month: `${year}-${String(mon + 1).padStart(2, '0')}`,
      revenue: {
        received: revenueReceived,
        pending: revenuePending,
        overdue: revenueOverdue,
        total: revenueReceived + revenuePending + revenueOverdue
      },
      expenses: {
        total: totalExpenses,
        paid: expensesPaid,
        pending: totalExpenses - expensesPaid
      },
      cashFlow: revenueReceived - expensesPaid,
      futureRevenue,
      sessionCount: sessions.length,
      patientBreakdown: Object.values(monthlyPatients),
      accounts: accounts.map(a => ({
        id: a.id, type: a.type, description: a.description, value: Number(a.value),
        dueDate: a.dueDate, status: a.status, category: a.category,
        patientName: a.patient?.name, paymentMethod: a.paymentMethod
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar relatório mensal', details: err.message });
  }
});

module.exports = router;
