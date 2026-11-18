const express = require('express');

const { authMiddleware } = require('../middleware/auth');
const { loadAccess, requireScope } = require('../middleware/access');
const { canAccessScope } = require('../permissions');
const { canAccessRecord } = require('../services/accessService');
const { logAudit } = require('../services/auditService');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);
router.use(loadAccess);

function recordScope(req, fallback = 'private') {
  return req.query?.scope === 'clinic' || req.body?.scope === 'clinic' ? 'clinic' : fallback;
}

function recordWhere(context, scope) {
  if (!canAccessScope(context, 'record:read', scope)) return null;
  if (scope === 'private') {
    return context.role === 'admin' || context.role === 'superadmin'
      ? { scope, professional: { organizationId: context.organizationId } }
      : { scope, professionalId: context.userId };
  }
  return { scope, professional: { organizationId: context.organizationId } };
}

// GET /api/prontuarios
router.get('/', requireScope('private', 'clinic'), async (req, res) => {
  try {
    const { patientId, coupleId } = req.query;
    const scope = recordScope(req, 'private');
    const where = recordWhere(req.access, scope);
    if (!where) return res.status(403).json({ error: 'Sem permissão para este escopo' });
    if (patientId) where.patientId = patientId;
    if (coupleId) where.coupleId = coupleId;

    const records = await prisma.record.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true } },
        couple: { select: { id: true, name: true } },
        appointment: { select: { id: true, date: true, time: true, type: true, mode: true } },
        testAssignments: { select: { id: true, score: true, classification: true, template: { select: { title: true, category: true } } } }
      },
      orderBy: { date: 'desc' }
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar prontuários' });
  }
});

// GET /api/prontuarios/patient-timeline/:patientId
router.get('/patient-timeline/:patientId', requireScope('private', 'clinic'), async (req, res) => {
  try {
    const scope = recordScope(req, 'private');
    const where = recordWhere(req.access, scope);
    if (!where) return res.status(403).json({ error: 'Sem permissão para este escopo' });
    const records = await prisma.record.findMany({
      where: { ...where, patientId: req.params.patientId },
      include: {
        appointment: { select: { id: true, date: true, time: true, type: true, mode: true } }
      },
      orderBy: { date: 'asc' }
    });

    // Extract themes frequency
    const themesMap = {};
    records.forEach(r => {
      if (r.themes && Array.isArray(r.themes)) {
        r.themes.forEach(t => {
          themesMap[t] = (themesMap[t] || 0) + 1;
        });
      }
    });

    res.json({
      records,
      totalSessions: records.length,
      themes: Object.entries(themesMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar timeline' });
  }
});

// GET /api/prontuarios/clinical-dashboard
router.get('/clinical-dashboard', requireScope('private', 'clinic'), async (req, res) => {
  try {
    const { patientId } = req.query;
    const scope = recordScope(req, 'private');
    const scoped = recordWhere(req.access, scope);
    if (!scoped) return res.status(403).json({ error: 'Sem permissão para este escopo' });
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const scopedRecordWhere = { ...scoped };
    if (patientId) scopedRecordWhere.patientId = patientId;

    const patientWhere = { ...scoped, status: 'active' };
    if (patientId) patientWhere.id = patientId;

    const [totalPatients, recentRecords, allRecords, patientsWithRecords] = await Promise.all([
      prisma.patient.count({ where: patientWhere }),
      prisma.record.findMany({
        where: { ...scopedRecordWhere, date: { gte: thirtyDaysAgo } },
        include: { patient: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      prisma.record.findMany({
        where: scopedRecordWhere,
        select: { id: true, patientId: true, content: true, complaint: true, keyPoints: true, themes: true, date: true },
      }),
      prisma.record.groupBy({
        by: ['patientId'],
        where: { ...scopedRecordWhere, patientId: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    // Find incomplete records (missing key structured fields)
    const incompleteRecords = allRecords.filter(r =>
      !r.complaint && !r.keyPoints && !r.content
    ).length;

    // Themes across all records
    const themesMap = {};
    allRecords.forEach(r => {
      if (r.themes && Array.isArray(r.themes)) {
        r.themes.forEach(t => { themesMap[t] = (themesMap[t] || 0) + 1; });
      }
    });

    // Get patient names for frequency list
    const patientIds = patientsWithRecords.map(p => p.patientId).filter(Boolean);
    const patientNames = await prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(patientNames.map(p => [p.id, p.name]));

    res.json({
      activePatients: totalPatients,
      totalRecords: allRecords.length,
      recentRecords,
      incompleteRecords,
      patientFrequency: patientsWithRecords.map(p => ({
        patientId: p.patientId,
        patientName: nameMap[p.patientId] || 'Desconhecido',
        count: p._count.id,
      })),
      themes: Object.entries(themesMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 15),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard clínico' });
  }
});

// GET /api/prontuarios/:id
router.get('/:id', async (req, res) => {
  try {
    const allowed = await canAccessRecord(req.access, req.params.id, 'record:read');
    if (!allowed) return res.status(404).json({ error: 'Prontuário não encontrado' });
    const record = await prisma.record.findFirst({
      where: { id: req.params.id },
      include: { patient: true, couple: true, appointment: true }
    });
    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });
    await logAudit(req, 'record.read', 'Record', record.id, {
      scope: record.scope,
      patientId: record.patientId,
      appointmentId: record.appointmentId,
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar prontuário' });
  }
});

// POST /api/prontuarios
router.post('/', requireScope('private', 'clinic'), async (req, res) => {
  try {
    if (!canAccessScope(req.access, 'record:write', recordScope(req, 'private'))) {
      return res.status(403).json({ error: 'Escopo não permitido para este usuário' });
    }
    const data = { ...req.body, professionalId: req.access.userId, scope: recordScope(req, 'private') };
    delete data.organizationId;
    if (data.date) data.date = new Date(data.date);
    const record = await prisma.record.create({ data });
    await logAudit(req, 'record.created', 'Record', record.id, {
      scope: record.scope,
      patientId: record.patientId,
      appointmentId: record.appointmentId,
    });
    res.status(201).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar prontuário', details: err.message });
  }
});

// PUT /api/prontuarios/:id
router.put('/:id', async (req, res) => {
  try {
    const allowed = await canAccessRecord(req.access, req.params.id, 'record:write');
    if (!allowed) return res.status(404).json({ error: 'Prontuário não encontrado' });
    const updateData = { ...req.body };
    if (updateData.date) updateData.date = new Date(updateData.date);
    updateData.updatedAt = new Date();

    const record = await prisma.record.updateMany({
      where: { id: req.params.id },
      data: updateData
    });
    if (record.count === 0) return res.status(404).json({ error: 'Prontuário não encontrado' });
    await logAudit(req, 'record.updated', 'Record', req.params.id, { scope: allowed.scope });
    const updated = await prisma.record.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar prontuário' });
  }
});

// POST /api/prontuarios/:id/organize-ai - Organize with AI
router.post('/:id/organize-ai', async (req, res) => {
  try {
    const allowed = await canAccessRecord(req.access, req.params.id, 'record:write');
    if (!allowed) return res.status(404).json({ error: 'Prontuário não encontrado' });
    const record = await prisma.record.findFirst({
      where: { id: req.params.id },
      include: { patient: { select: { name: true } } }
    });
    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });

    // Find AI provider key
    const providerKey = await findAiKey(req.userId);
    if (!providerKey) return res.status(400).json({ error: 'Nenhuma chave de IA configurada. Configure em Configurações > IA.' });

    const rawContent = [record.content, record.complaint, record.keyPoints, record.clinicalObservations, record.interventions, record.evolution, record.nextSteps]
      .filter(Boolean).join('\n\n');

    if (!rawContent.trim()) return res.status(400).json({ error: 'Prontuário sem conteúdo para organizar' });

    const systemPrompt = `Você é um assistente clínico para psicólogos. Sua função é organizar anotações de sessões em um prontuário estruturado. 
IMPORTANTE: Você NÃO gera diagnósticos. Apenas organiza informações.

Organize o texto a seguir nas seguintes seções, retornando em formato JSON:
{
  "complaint": "Motivo/demanda principal da sessão",
  "keyPoints": "Principais pontos e temas abordados na sessão",
  "clinicalObservations": "Observações clínicas do profissional",
  "interventions": "Intervenções e técnicas utilizadas",
  "evolution": "Comparação com sessões anteriores e evolução",
  "nextSteps": "Próximos passos e encaminhamentos",
  "themes": ["tema1", "tema2"],
  "summary": "Resumo breve e objetivo da sessão"
}

Mantenha linguagem neutra, profissional e objetiva. Preserve o conteúdo original sem adicionar interpretações clínicas.`;

    const result = await callAiProvider(providerKey.provider, providerKey.apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Paciente: ${record.patient?.name || 'Não identificado'}\nData: ${record.date}\n\nConteúdo da sessão:\n${rawContent}` }
    ], providerKey.model);

    // Try to parse JSON from AI response
    let organized;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      organized = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch { organized = null; }

    if (organized) {
      // Update record with structured data
      const updateData = {};
      if (organized.complaint) updateData.complaint = organized.complaint;
      if (organized.keyPoints) updateData.keyPoints = organized.keyPoints;
      if (organized.clinicalObservations) updateData.clinicalObservations = organized.clinicalObservations;
      if (organized.interventions) updateData.interventions = organized.interventions;
      if (organized.evolution) updateData.evolution = organized.evolution;
      if (organized.nextSteps) updateData.nextSteps = organized.nextSteps;
      if (organized.themes) updateData.themes = organized.themes;
      if (organized.summary) updateData.aiContent = organized.summary;
      updateData.updatedAt = new Date();

      await prisma.record.update({ where: { id: req.params.id }, data: updateData });
      const updated = await prisma.record.findUnique({ where: { id: req.params.id } });
      res.json({ success: true, record: updated, organized });
    } else {
      // Return raw AI text if parsing failed
      await prisma.record.update({ where: { id: req.params.id }, data: { aiContent: result, updatedAt: new Date() } });
      const updated = await prisma.record.findUnique({ where: { id: req.params.id } });
      res.json({ success: true, record: updated, rawText: result });
    }
  } catch (err) {
    console.error('Organize AI error:', err);
    res.status(500).json({ error: 'Erro ao organizar com IA', details: err.message });
  }
});

// POST /api/prontuarios/:id/clinical-support - Generate clinical support
router.post('/:id/clinical-support', async (req, res) => {
  try {
    const allowed = await canAccessRecord(req.access, req.params.id, 'record:write');
    if (!allowed) return res.status(404).json({ error: 'Prontuário não encontrado' });
    const record = await prisma.record.findFirst({
      where: { id: req.params.id },
      include: { patient: { select: { id: true, name: true } } }
    });
    if (!record) return res.status(404).json({ error: 'Prontuário não encontrado' });

    const providerKey = await findAiKey(req.userId);
    if (!providerKey) return res.status(400).json({ error: 'Nenhuma chave de IA configurada.' });

    // Get previous records for this patient for evolution analysis
    const previousRecords = record.patientId ? await prisma.record.findMany({
      where: { patientId: record.patientId, scope: record.scope, professionalId: record.scope === 'private' ? record.professionalId : undefined, date: { lt: record.date } },
      orderBy: { date: 'desc' },
      take: 5,
      select: { date: true, content: true, complaint: true, keyPoints: true, themes: true, evolution: true }
    }) : [];

    const currentContent = [record.complaint, record.keyPoints, record.clinicalObservations, record.interventions, record.evolution, record.content]
      .filter(Boolean).join('\n');

    const previousSummary = previousRecords.map((r, i) =>
      `Sessão ${i + 1} (${new Date(r.date).toLocaleDateString('pt-BR')}): ${[r.complaint, r.keyPoints, r.content].filter(Boolean).join(' | ')} ${r.themes?.length ? `[Temas: ${r.themes.join(', ')}]` : ''}`
    ).join('\n');

    const systemPrompt = `Você é um assistente de apoio clínico para psicólogos. 
⚠️ IMPORTANTE: Suas sugestões NÃO substituem a avaliação profissional. Você NÃO gera diagnósticos.

Com base nas informações da sessão atual e do histórico, forneça:

1. **Pontos de atenção**: Aspectos que merecem observação continuada
2. **Padrões comportamentais percebidos**: Recorrências ou mudanças notáveis
3. **Temas recorrentes**: Assuntos que aparecem frequentemente
4. **Possíveis focos para próximas sessões**: Sugestões de continuidade
5. **Evolução observada**: Mudanças em relação às sessões anteriores

Responda em formato organizado e conciso. Sempre deixe claro que são sugestões de apoio.`;

    const userContent = `SESSÃO ATUAL:\n${currentContent}\n\n${previousSummary ? `HISTÓRICO (últimas sessões):\n${previousSummary}` : 'Sem histórico anterior disponível.'}`;

    const result = await callAiProvider(providerKey.provider, providerKey.apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ], providerKey.model);

    // Save as clinical support
    await prisma.record.update({
      where: { id: req.params.id },
      data: { aiClinicalSupport: result, updatedAt: new Date() }
    });

    res.json({
      success: true,
      clinicalSupport: result,
      disclaimer: 'Sugestão de apoio — não substitui avaliação profissional.'
    });
  } catch (err) {
    console.error('Clinical support error:', err);
    res.status(500).json({ error: 'Erro ao gerar apoio clínico', details: err.message });
  }
});

// POST /api/prontuarios/patient-analysis/:patientId - AI analysis of patient evolution
router.post('/patient-analysis/:patientId', requireScope('private', 'clinic'), async (req, res) => {
  try {
    const scope = recordScope(req, 'private');
    const scoped = recordWhere(req.access, scope);
    if (!scoped) return res.status(403).json({ error: 'Sem permissão para este escopo' });
    const records = await prisma.record.findMany({
      where: { ...scoped, patientId: req.params.patientId },
      orderBy: { date: 'asc' },
      select: { date: true, content: true, complaint: true, keyPoints: true, clinicalObservations: true, evolution: true, themes: true, interventions: true }
    });

    if (records.length < 2) return res.status(400).json({ error: 'São necessárias pelo menos 2 sessões para análise evolutiva.' });

    const providerKey = await findAiKey(req.userId);
    if (!providerKey) return res.status(400).json({ error: 'Nenhuma chave de IA configurada.' });

    const sessionsSummary = records.map((r, i) =>
      `Sessão ${i + 1} (${new Date(r.date).toLocaleDateString('pt-BR')}): ${[r.complaint, r.keyPoints, r.content].filter(Boolean).join(' | ')} ${r.themes?.length ? `[Temas: ${r.themes.join(', ')}]` : ''}`
    ).join('\n\n');

    const systemPrompt = `Você é um assistente de apoio clínico para psicólogos. Analise o histórico de sessões e forneça:

⚠️ IMPORTANTE: Análise de apoio — NÃO substitui avaliação profissional. NÃO gera diagnósticos.

Responda em JSON com a seguinte estrutura:
{
  "emotionalEvolution": "Descrição da evolução emocional ao longo das sessões",
  "themeFrequency": [{"theme": "tema", "frequency": número, "trend": "crescente|estável|decrescente"}],
  "patternChanges": ["mudança 1", "mudança 2"],
  "criticalPeriods": ["período ou sessão com aspectos relevantes"],
  "identifiedPatterns": ["padrão 1", "padrão 2"],
  "attentionPoints": ["ponto 1", "ponto 2"],
  "overallProgress": "Resumo geral do progresso"
}`;

    const result = await callAiProvider(providerKey.provider, providerKey.apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Histórico de ${records.length} sessões:\n\n${sessionsSummary}` }
    ], providerKey.model);

    let analysis;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawText: result };
    } catch { analysis = { rawText: result }; }

    res.json({
      success: true,
      analysis,
      totalSessions: records.length,
      disclaimer: 'Análise de apoio — não substitui avaliação profissional.'
    });
  } catch (err) {
    console.error('Patient analysis error:', err);
    res.status(500).json({ error: 'Erro ao analisar evolução', details: err.message });
  }
});

// Helper: Find AI key (user > org > global)
async function findAiKey(userId) {
  const keys = await prisma.aiProviderKey.findMany({
    where: { OR: [{ userId }, { isGlobal: true }] },
    orderBy: { createdAt: 'desc' }
  });
  // Prefer user key, then global
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
