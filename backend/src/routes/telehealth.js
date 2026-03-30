const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

const AUDIO_DIR = path.join(__dirname, '../../tmp/telehealth-audio');
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Helper: create audit log
async function auditLog(sessionId, action, details) {
  await prisma.telehealthAuditLog.create({
    data: { sessionId, action, details: typeof details === 'string' ? details : JSON.stringify(details) }
  });
}

// Helper: find AI key for transcription
async function findAiKey(userId) {
  const keys = await prisma.aiProviderKey.findMany({
    where: { OR: [{ userId }, { isGlobal: true }] },
    orderBy: { createdAt: 'desc' }
  });
  return keys.find(k => k.provider === 'openai') || keys[0];
}

// Helper: call OpenAI Whisper for transcription
async function transcribeAudio(filePath, apiKey) {
  const FormData = (await import('form-data')).default;
  const fetch = (await import('node-fetch')).default;
  
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('model', 'whisper-1');
  form.append('language', 'pt');
  form.append('response_format', 'text');
  
  const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, ...form.getHeaders() },
    body: form
  });
  
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Whisper API error: ${resp.status} - ${err}`);
  }
  return resp.text();
}

// Helper: organize transcription with AI
async function organizeWithAi(transcription, provider, apiKey) {
  const fetch = (await import('node-fetch')).default;
  
  const systemPrompt = `Você é um assistente clínico para psicólogos. Organize a transcrição de uma sessão terapêutica no seguinte formato estruturado. NÃO emita diagnósticos. Apenas organize o conteúdo.

Responda em JSON com estas chaves:
- motivo_sessao: motivo/queixa principal da sessão
- temas_abordados: array de temas discutidos
- observacoes_relevantes: observações clínicas relevantes
- evolucao: evolução do paciente
- encaminhamentos: próximos passos ou encaminhamentos
- resumo: resumo conciso da sessão
- pontos_principais: array de pontos-chave`;

  let url, headers, body;
  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    body = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: transcription }],
      response_format: { type: 'json_object' }
    });
  } else if (provider === 'anthropic') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' };
    body = JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: transcription }]
    });
  } else {
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
    body = JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\nTranscrição:\n${transcription}` }] }],
      generationConfig: { responseMimeType: 'application/json' }
    });
  }

  const resp = await fetch(url, { method: 'POST', headers, body });
  const data = await resp.json();
  
  let content;
  if (provider === 'openai') content = data.choices?.[0]?.message?.content;
  else if (provider === 'anthropic') content = data.content?.[0]?.text;
  else content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  try { return JSON.parse(content); } catch { return { resumo: content }; }
}

// LIST sessions
router.get('/', async (req, res) => {
  try {
    const sessions = await prisma.telehealthSession.findMany({
      where: { professionalId: req.userId },
      include: { patient: { select: { id: true, name: true } }, couple: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    // Never expose audio file names
    const safe = sessions.map(s => ({ ...s, audioFileName: undefined }));
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar sessões', details: err.message });
  }
});

// GET single session
router.get('/:id', async (req, res) => {
  try {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: req.params.id, professionalId: req.userId },
      include: {
        patient: { select: { id: true, name: true } },
        couple: { select: { id: true, name: true } },
        auditLogs: { orderBy: { createdAt: 'asc' } }
      }
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json({ ...session, audioFileName: undefined });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar sessão', details: err.message });
  }
});

// CREATE session
router.post('/', async (req, res) => {
  try {
    const { patientId, coupleId, appointmentId, meetingLink } = req.body;
    const session = await prisma.telehealthSession.create({
      data: {
        professionalId: req.userId,
        patientId: patientId || null,
        coupleId: coupleId || null,
        appointmentId: appointmentId || null,
        meetingLink: meetingLink || null,
        consentAccepted: true
      },
      include: { patient: { select: { id: true, name: true } }, couple: { select: { id: true, name: true } } }
    });
    await auditLog(session.id, 'session_created', { patientId, coupleId });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar sessão', details: err.message });
  }
});

// UPDATE session (only if not yet uploaded/processed)
router.patch('/:id', async (req, res) => {
  try {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: req.params.id, professionalId: req.userId }
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.status !== 'waiting') return res.status(400).json({ error: 'Sessão já iniciada, não pode ser editada' });

    const { patientId, meetingLink } = req.body;
    const updated = await prisma.telehealthSession.update({
      where: { id: req.params.id },
      data: {
        ...(patientId !== undefined && { patientId: patientId || null }),
        ...(meetingLink !== undefined && { meetingLink: meetingLink || null }),
        updatedAt: new Date()
      },
      include: { patient: { select: { id: true, name: true } }, couple: { select: { id: true, name: true } } }
    });
    await auditLog(session.id, 'session_updated', { patientId, meetingLink });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar sessão', details: err.message });
  }
});

// DELETE session (only if not yet uploaded/processed)
router.delete('/:id', async (req, res) => {
  try {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: req.params.id, professionalId: req.userId }
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (!['waiting', 'completed', 'error'].includes(session.status) && session.processingStatus === 'transcribing') {
      return res.status(400).json({ error: 'Sessão em processamento, não pode ser excluída' });
    }

    // Clean up audio file if exists
    if (session.audioFileName) {
      const filePath = path.join(AUDIO_DIR, session.audioFileName);
      try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    }

    await prisma.telehealthAuditLog.deleteMany({ where: { sessionId: session.id } });
    await prisma.telehealthSession.delete({ where: { id: session.id } });
    res.json({ message: 'Sessão excluída' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir sessão', details: err.message });
  }
});

// PROCESS session with AI (for uploaded sessions not yet processed)
router.post('/:id/process', async (req, res) => {
  try {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: req.params.id, professionalId: req.userId }
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.processingStatus === 'completed') return res.status(400).json({ error: 'Sessão já processada' });
    if (!session.audioFileName) return res.status(400).json({ error: 'Nenhum áudio disponível para processar' });

    processTranscription(req.params.id, req.userId).catch(console.error);
    res.json({ message: 'Processamento iniciado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar', details: err.message });
  }
});

// START capture
router.post('/:id/start', async (req, res) => {
  try {
    const session = await prisma.telehealthSession.update({
      where: { id: req.params.id },
      data: { status: 'capturing', startedAt: new Date(), updatedAt: new Date() }
    });
    await auditLog(session.id, 'capture_started', null);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao iniciar captura', details: err.message });
  }
});

// UPLOAD audio
router.post('/:id/upload', express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '200mb' }), async (req, res) => {
  try {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: req.params.id, professionalId: req.userId }
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    const fileName = `${crypto.randomUUID()}.webm`;
    const filePath = path.join(AUDIO_DIR, fileName);
    fs.writeFileSync(filePath, req.body);

    await prisma.telehealthSession.update({
      where: { id: req.params.id },
      data: {
        audioFileName: fileName,
        audioUploadedAt: new Date(),
        status: 'uploaded',
        endedAt: new Date(),
        duration: session.startedAt ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000) : null,
        processingStatus: 'uploaded',
        updatedAt: new Date()
      }
    });
    await auditLog(session.id, 'audio_uploaded', { fileName: '***', size: req.body.length });

    // Start async transcription
    processTranscription(req.params.id, req.userId).catch(err => {
      console.error('Transcription error:', err);
    });

    res.json({ message: 'Áudio enviado. Transcrição em processamento.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao enviar áudio', details: err.message });
  }
});

// Async transcription + AI organization + auto-delete
async function processTranscription(sessionId, userId) {
  try {
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: { processingStatus: 'transcribing', transcriptionStartedAt: new Date(), updatedAt: new Date() }
    });
    await auditLog(sessionId, 'transcription_started', null);

    const session = await prisma.telehealthSession.findUnique({ where: { id: sessionId } });
    if (!session?.audioFileName) throw new Error('Arquivo de áudio não encontrado');

    const filePath = path.join(AUDIO_DIR, session.audioFileName);
    const aiKey = await findAiKey(userId);
    if (!aiKey) throw new Error('Chave de IA não configurada. Configure uma chave OpenAI para transcrição.');

    // Transcribe
    const transcription = await transcribeAudio(filePath, aiKey.apiKey);

    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: { transcription, transcriptionEndedAt: new Date(), processingStatus: 'organizing', updatedAt: new Date() }
    });
    await auditLog(sessionId, 'transcription_completed', { length: transcription.length });

    // Organize with AI
    let structured = null;
    try {
      structured = await organizeWithAi(transcription, aiKey.provider, aiKey.apiKey);
    } catch (e) {
      console.error('AI organization error:', e);
    }

    // Create record
    const record = await prisma.record.create({
      data: {
        professionalId: userId,
        patientId: session.patientId,
        coupleId: session.coupleId,
        appointmentId: session.appointmentId,
        type: session.coupleId ? 'couple' : 'individual',
        date: session.startedAt || new Date(),
        content: transcription,
        aiContent: structured ? JSON.stringify(structured) : null,
        complaint: structured?.motivo_sessao || null,
        keyPoints: structured?.pontos_principais ? structured.pontos_principais.join('; ') : null,
        clinicalObservations: structured?.observacoes_relevantes || null,
        evolution: structured?.evolucao || null,
        nextSteps: structured?.encaminhamentos || null,
        modality: 'telehealth',
        themes: structured?.temas_abordados || []
      }
    });

    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        recordId: record.id,
        structuredContent: structured ? JSON.stringify(structured) : null,
        aiOrganizedContent: structured?.resumo || null,
        processingStatus: 'completed',
        updatedAt: new Date()
      }
    });
    await auditLog(sessionId, 'record_created', { recordId: record.id });

    // DELETE audio file immediately
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await prisma.telehealthSession.update({
        where: { id: sessionId },
        data: { audioFileName: null, audioDeletedAt: new Date(), status: 'completed', updatedAt: new Date() }
      });
      await auditLog(sessionId, 'audio_deleted', { reason: 'transcription_completed' });
    } catch (delErr) {
      console.error('Error deleting audio:', delErr);
      // Schedule for later cleanup
      await auditLog(sessionId, 'audio_delete_failed', { error: delErr.message });
    }
  } catch (err) {
    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: { processingStatus: 'error', processingError: err.message, updatedAt: new Date() }
    });
    await auditLog(sessionId, 'processing_error', { error: err.message });

    // Cleanup audio even on error (after 1 retry)
    const session = await prisma.telehealthSession.findUnique({ where: { id: sessionId } });
    if (session?.audioFileName) {
      const filePath = path.join(AUDIO_DIR, session.audioFileName);
      setTimeout(async () => {
        try {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          await prisma.telehealthSession.update({
            where: { id: sessionId },
            data: { audioFileName: null, audioDeletedAt: new Date(), updatedAt: new Date() }
          });
          await auditLog(sessionId, 'audio_deleted', { reason: 'cleanup_after_error' });
        } catch (e) { console.error('Cleanup error:', e); }
      }, 3600000); // 1 hour max retention
    }
  }
}

// GET processing status
router.get('/:id/status', async (req, res) => {
  try {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: req.params.id, professionalId: req.userId },
      select: { id: true, status: true, processingStatus: true, processingError: true, recordId: true, transcription: true, structuredContent: true }
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar status', details: err.message });
  }
});

// RETRY transcription
router.post('/:id/retry', async (req, res) => {
  try {
    const session = await prisma.telehealthSession.findFirst({
      where: { id: req.params.id, professionalId: req.userId }
    });
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });
    if (session.processingStatus !== 'error') return res.status(400).json({ error: 'Sessão não está em estado de erro' });
    if (!session.audioFileName) return res.status(400).json({ error: 'Áudio já foi excluído' });

    processTranscription(req.params.id, req.userId).catch(console.error);
    res.json({ message: 'Reprocessamento iniciado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao reprocessar', details: err.message });
  }
});

// Periodic cleanup: delete any audio files older than 2 hours
setInterval(async () => {
  try {
    const stale = await prisma.telehealthSession.findMany({
      where: {
        audioFileName: { not: null },
        audioUploadedAt: { lt: new Date(Date.now() - 7200000) }
      }
    });
    for (const s of stale) {
      const fp = path.join(AUDIO_DIR, s.audioFileName);
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
      await prisma.telehealthSession.update({
        where: { id: s.id },
        data: { audioFileName: null, audioDeletedAt: new Date(), updatedAt: new Date() }
      });
      await auditLog(s.id, 'audio_deleted', { reason: 'periodic_cleanup' });
    }
  } catch {}
}, 1800000); // every 30 min

module.exports = router;
