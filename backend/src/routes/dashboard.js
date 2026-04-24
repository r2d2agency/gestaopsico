const express = require('express');

const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [totalPatients, todayAppointments, todaySchedule, paidSum, pendingSum] = await Promise.all([
      prisma.patient.count({ where: { professionalId: req.userId, status: 'active' } }),
      prisma.appointment.count({
        where: { professionalId: req.userId, date: { gte: today, lt: tomorrow }, status: 'scheduled' }
      }),
      prisma.appointment.findMany({
        where: { professionalId: req.userId, date: { gte: today, lt: tomorrow }, status: 'scheduled' },
        orderBy: { date: 'asc' },
        include: { patient: { select: { name: true } } }
      }),
      prisma.payment.aggregate({
        where: {
          appointment: { professionalId: req.userId },
          createdAt: { gte: monthStart },
          status: 'paid'
        },
        _sum: { value: true }
      }),
      prisma.payment.aggregate({
        where: {
          appointment: { professionalId: req.userId },
          status: 'pending'
        },
        _sum: { value: true }
      })
    ]);

    res.json({
      total_patients: totalPatients,
      today_appointments: todayAppointments,
      monthly_revenue: Number(paidSum._sum.value || 0),
      pending_payments: Number(pendingSum._sum.value || 0),
      today_schedule: todaySchedule.map(a => ({
        time: a.time || '',
        patient: a.patient,
        type: a.type || 'individual',
        status: a.status
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar resumo', details: err.message });
  }
});

module.exports = router;
