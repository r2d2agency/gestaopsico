const express = require('express');

const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../db');

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

// POST /api/mood/patient/:patientId/ai-analysis - AI mood analysis for professional
router.post('/patient/:patientId/ai-analysis', async (req, res) => {
  try {
    const patient = await prisma.patient.findFirst({
      where: { id: req.params.patientId, professionalId: req.userId }
    });
    if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

    const entries = await prisma.moodEntry.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { date: 'asc' }
    });

    if (entries.length < 3) {
      return res.status(400).json({ error: 'São necessários pelo menos 3 registros de humor para análise' });
    }

    const aiKey = await findAiKey(req.userId);
    if (!aiKey) return res.status(400).json({ error: 'Nenhuma chave de IA configurada. Configure em Configurações > IA.' });

    const moodLabels = ['Muito mal', 'Mal', 'Neutro', 'Bem', 'Muito bem'];
    const summary = entries.map(e => {
      const d = new Date(e.date).toLocaleDateString('pt-BR');
      const emotions = (e.emotions || []).join(', ');
      return `${d}: Humor ${e.mood}/5 (${moodLabels[e.mood - 1]})${emotions ? `, Emoções: ${emotions}` : ''}${e.notes ? `, Notas: ${e.notes}` : ''}${e.energyLevel ? `, Energia: ${e.energyLevel}/5` : ''}${e.sleepQuality ? `, Sono: ${e.sleepQuality}/5` : ''}${e.anxietyLevel ? `, Ansiedade: ${e.anxietyLevel}/5` : ''}`;
    }).join('\n');

    const messages = [
      {
        role: 'system',
        content: `Você é um assistente clínico para psicólogos. Analise os registros de humor do paciente "${patient.name}" e forneça insights clínicos. IMPORTANTE: Isso é apenas apoio — não gere diagnósticos. Responda em português do Brasil em formato estruturado com as seguintes seções:
1. **Padrão Geral**: Tendência geral do humor ao longo do período
2. **Emoções Predominantes**: Quais emoções aparecem com mais frequência e padrões
3. **Correlações**: Relação entre humor, energia, sono e ansiedade
4. **Períodos Críticos**: Momentos de queda ou pico significativos
5. **Pontos de Atenção**: Aspectos que merecem atenção clínica
6. **Sugestões para Sessão**: Temas que podem ser explorados nas próximas sessões`
      },
      {
        role: 'user',
        content: `Analise os ${entries.length} registros de humor do paciente "${patient.name}" coletados ao longo de ${Math.ceil((new Date(entries[entries.length-1].date) - new Date(entries[0].date)) / (1000*60*60*24))} dias:\n\n${summary}`
      }
    ];

    const result = await callAiProvider(aiKey.provider, aiKey.apiKey, messages, aiKey.model);

    res.json({
      success: true,
      analysis: result,
      totalEntries: entries.length,
      period: {
        from: entries[0].date,
        to: entries[entries.length - 1].date
      },
      disclaimer: 'Esta análise é gerada por IA como apoio clínico. Não constitui diagnóstico. O psicólogo deve revisar e interpretar os dados.'
    });
  } catch (err) {
    console.error('Mood AI analysis error:', err);
    res.status(500).json({ error: 'Erro ao gerar análise de humor', details: err.message });
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

// Helper: Find AI key (user > org > global)
async function findAiKey(userId) {
  const keys = await prisma.aiProviderKey.findMany({
    where: { OR: [{ userId }, { isGlobal: true }] },
    orderBy: { createdAt: 'desc' }
  });
  const userKey = keys.find(k => k.userId === userId);
  const globalKey = keys.find(k => k.isGlobal);
  const key = userKey || globalKey;
  if (!key) return null;
  const modelMap = { openai: 'gpt-4o', claude: 'claude-sonnet-4-20250514', gemini: 'gemini-2.0-flash' };
  return { provider: key.provider, apiKey: key.apiKey, model: modelMap[key.provider] || key.provider };
}

// AI provider call helper
async function callAiProvider(provider, apiKey, messages, model) {
  let url, body, headers;
  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    body = { model: model || 'gpt-4o', messages, max_tokens: 3000 };
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' };
    const system = messages.find(m => m.role === 'system')?.content || '';
    const msgs = messages.filter(m => m.role !== 'system');
    body = { model: model || 'claude-sonnet-4-20250514', max_tokens: 3000, system, messages: msgs };
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.0-flash'}:generateContent?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
    const systemPart = messages.find(m => m.role === 'system')?.content || '';
    const parts = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    body = {
      systemInstruction: { parts: [{ text: systemPart }] },
      contents: parts,
      generationConfig: { maxOutputTokens: 3000 },
    };
  }
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(`${provider} API error: ${JSON.stringify(data)}`);
  if (provider === 'openai') return data.choices[0].message.content;
  if (provider === 'claude') return data.content[0].text;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
}

module.exports = router;
