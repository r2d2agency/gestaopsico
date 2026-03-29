const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalPatients, todayAppointments, monthAppointments, financialSummary] = await Promise.all([
      prisma.patient.count({ where: { professionalId: req.userId, status: 'active' } }),
      prisma.appointment.count({
        where: { professionalId: req.userId, date: { gte: today, lt: tomorrow }, status: 'scheduled' }
      }),
      prisma.appointment.count({
        where: {
          professionalId: req.userId,
          date: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          status: { not: 'cancelled' }
        }
      }),
      prisma.payment.aggregate({
        where: {
          appointment: { professionalId: req.userId },
          createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          status: 'paid'
        },
        _sum: { value: true }
      })
    ]);

    res.json({
      totalPatients,
      todayAppointments,
      monthAppointments,
      monthRevenue: Number(financialSummary._sum.value || 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar resumo', details: err.message });
  }
});

module.exports = router;
