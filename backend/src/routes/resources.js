const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);

// GET /api/recursos - listar recursos
router.get('/', async (req, res) => {
  try {
    const resources = await prisma.therapeuticResource.findMany({
      where: {
        OR: [
          { professionalId: req.userId },
          { isGlobal: true }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(resources);
  } catch (err) {
    console.error('Error listing resources:', err);
    res.status(500).json({ error: 'Erro ao listar recursos' });
  }
});

// POST /api/recursos - criar recurso
router.post('/', async (req, res) => {
  try {
    const { title, description, category, type, fileUrl, externalUrl } = req.body;
    if (!title || !category || !type) {
      return res.status(400).json({ error: 'Título, categoria e tipo são obrigatórios' });
    }

    const resource = await prisma.therapeuticResource.create({
      data: {
        title,
        description,
        category,
        type,
        fileUrl,
        externalUrl,
        professionalId: req.userId,
        isGlobal: false
      }
    });
    res.status(201).json(resource);
  } catch (err) {
    console.error('Error creating resource:', err);
    res.status(500).json({ error: 'Erro ao criar recurso' });
  }
});

// POST /api/recursos/generate - gerar recurso com IA
router.post('/generate', async (req, res) => {
  try {
    const { prompt, category, type } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt é obrigatório' });

    // Determinar modelo e key (preferencialmente Gemini)
    const providerKey = await prisma.aiProviderKey.findFirst({
      where: {
        provider: 'gemini',
        OR: [
          { userId: req.userId },
          { isGlobal: true },
        ],
      },
      orderBy: { isGlobal: 'asc' },
    });

    if (!providerKey) {
      return res.status(400).json({ error: 'Nenhuma API key de IA configurada para gerar conteúdo.' });
    }

    const systemPrompt = `Você é um psicólogo clínico experiente especializado em criar recursos terapêuticos. 
Sua tarefa é gerar um material de apoio (recurso terapêutico) baseado na solicitação do usuário.
O conteúdo deve ser profissional, empático e baseado em evidências.

Retorne APENAS um objeto JSON válido no seguinte formato:
{
  "title": "Título do Recurso",
  "description": "Breve descrição do objetivo deste material",
  "content": "Conteúdo detalhado do recurso formatado em Markdown"
}

Solicitação: ${prompt}
Categoria sugerida: ${category || 'Geral'}
Tipo: ${type || 'Template'}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${providerKey.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`IA Error: ${JSON.stringify(data)}`);

    const aiResult = JSON.parse(data.candidates[0].content.parts[0].text);

    // Criar o recurso no banco de dados automaticamente
    const resource = await prisma.therapeuticResource.create({
      data: {
        title: aiResult.title,
        description: aiResult.description + "\n\n" + aiResult.content,
        category: category || 'Gerado por IA',
        type: type || 'Template',
        professionalId: req.userId,
        isGlobal: false
      }
    });

    res.status(201).json(resource);
  } catch (err) {
    console.error('Error generating resource:', err);
    res.status(500).json({ error: 'Erro ao gerar recurso com IA' });
  }
});

// DELETE /api/recursos/:id - deletar recurso
router.delete('/:id', async (req, res) => {
  try {
    const resource = await prisma.therapeuticResource.findUnique({
      where: { id: req.params.id }
    });

    if (!resource) return res.status(404).json({ error: 'Recurso não encontrado' });
    if (resource.professionalId !== req.userId) return res.status(403).json({ error: 'Sem permissão' });

    await prisma.therapeuticResource.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar recurso' });
  }
});

module.exports = router;
