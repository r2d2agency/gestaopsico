const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// POST /api/mood - create mood entry (patient portal) - multiple per day allowed
router.post('/', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Apenas pacientes podem registrar humor' });

    const { mood, emotions, notes, energyLevel, sleepQuality, anxietyLevel } = req.body;
    if (!mood || mood < 1 || mood > 5) return res.status(400).json({ error: 'Humor deve ser entre 1 e 5' });

    // Always create a new entry with current timestamp
    const now = new Date();

    const entry = await prisma.moodEntry.create({
      data: {
        patientId: user.patientId,
        mood,
        emotions: emotions || [],
        notes,
        energyLevel,
        sleepQuality,
        anxietyLevel,
        date: now
      }
    });

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar humor', details: err.message });
  }
});

// GET /api/mood/my - patient's own mood history
router.get('/my', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user?.patientId) return res.status(403).json({ error: 'Acesso negado' });

    const { days = 30 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const entries = await prisma.moodEntry.findMany({
      where: { patientId: user.patientId, date: { gte: since } },
      orderBy: { date: 'desc' }
    });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar humor' });
  }
});

// GET /api/mood/patient/:patientId - professional view
router.get('/patient/:patientId', async (req, res) => {
  try {
    // Verify professional has access to this patient
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.patientId, professionalId: req.userId }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const { days = 90 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const entries = await prisma.moodEntry.findMany({
      where: { patientId: req.params.patientId, date: { gte: since } },
      orderBy: { date: 'asc' }
    });

    // Calculate averages
    const avgMood = entries.length ? entries.reduce((s, e) => s + e.mood, 0) / entries.length : 0;
    const emotionFrequency = {};
    entries.forEach(e => {
      (e.emotions || []).forEach(em => {
        emotionFrequency[em] = (emotionFrequency[em] || 0) + 1;
      });
    });

    res.json({
      entries,
      stats: {
        totalEntries: entries.length,
        avgMood: Math.round(avgMood * 10) / 10,
        emotionFrequency,
        streak: calculateStreak(entries)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar humor do paciente' });
  }
});

function calculateStreak(entries) {
  if (!entries.length) return 0;
  let streak = 1;
  const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i - 1].date) - new Date(sorted[i].date)) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) streak++;
    else break;
  }
  return streak;
}

module.exports = router;
