const express = require('express');

const { authMiddleware } = require('../middleware/auth');
const { superadminGuard } = require('../middleware/adminGuard');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);

// Middleware para carregar dados do usuário após autenticação
router.use(async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, role: true, status: true, organizationId: true }
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Conta desativada' });
    req.user = user;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar usuário', details: err.message });
  }
});

// ========== SUPERADMIN: CRUD Agentes ==========

// GET /api/ai/agents - listar agentes (todos podem ver os ativos)
router.get('/agents', async (req, res) => {
  try {
    const where = req.user.role === 'superadmin' ? {} : { isActive: true };
    const agents = await prisma.aiAgent.findMany({
      where,
      include: { _count: { select: { chats: true, customizations: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(agents);
  } catch (err) {
    console.error('AI agents disabled or table missing:', err.message);
    res.json([]);
  }
});

// POST /api/ai/agents (superadmin)
router.post('/agents', superadminGuard, async (req, res) => {
  try {
    const { name, description, systemPrompt, capabilities, category, defaultModel } = req.body;
    const agent = await prisma.aiAgent.create({
      data: {
        name,
        description,
        systemPrompt,
        capabilities: capabilities || [],
        category: category || 'general',
        defaultModel: defaultModel || 'gemini',
        createdBy: req.user.id,
      },
    });
    res.status(201).json(agent);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar agente', details: err.message });
  }
});

// PATCH /api/ai/agents/:id (superadmin)
router.patch('/agents/:id', superadminGuard, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    delete data.id;
    delete data.createdAt;
    const agent = await prisma.aiAgent.update({ where: { id }, data });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar agente', details: err.message });
  }
});

// DELETE /api/ai/agents/:id (superadmin)
router.delete('/agents/:id', superadminGuard, async (req, res) => {
  try {
    await prisma.aiAgent.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir agente', details: err.message });
  }
});

// ========== CUSTOMIZAÇÕES DO PROFISSIONAL ==========

// GET /api/ai/agents/:id/customization
router.get('/agents/:id/customization', async (req, res) => {
  try {
    const customization = await prisma.aiAgentCustomization.findUnique({
      where: { agentId_userId: { agentId: req.params.id, userId: req.user.id } },
    });
    res.json(customization || {});
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar customização', details: err.message });
  }
});

// PUT /api/ai/agents/:id/customization
router.put('/agents/:id/customization', async (req, res) => {
  try {
    const { additionalPrompt, preferredModel } = req.body;
    const customization = await prisma.aiAgentCustomization.upsert({
      where: { agentId_userId: { agentId: req.params.id, userId: req.user.id } },
      update: { additionalPrompt, preferredModel },
      create: {
        agentId: req.params.id,
        userId: req.user.id,
        additionalPrompt,
        preferredModel,
      },
    });
    res.json(customization);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar customização', details: err.message });
  }
});

// ========== PROVIDER KEYS ==========

// GET /api/ai/providers
router.get('/providers', async (req, res) => {
  try {
    let keys;
    if (req.user.role === 'superadmin') {
      keys = await prisma.aiProviderKey.findMany({ orderBy: { createdAt: 'desc' } });
    } else {
      keys = await prisma.aiProviderKey.findMany({
        where: {
          OR: [
            { isGlobal: true },
            { userId: req.user.id },
            ...(req.user.organizationId ? [{ organizationId: req.user.organizationId }] : []),
          ],
        },
      });
    }
    // Mascarar API keys
    const masked = keys.map(k => ({
      ...k,
      apiKey: k.apiKey.slice(0, 8) + '...' + k.apiKey.slice(-4),
    }));
    res.json(masked);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar providers', details: err.message });
  }
});

// POST /api/ai/providers
router.post('/providers', async (req, res) => {
  try {
    const { provider, apiKey, isGlobal } = req.body;
    const data = { provider, apiKey };

    if (req.user.role === 'superadmin' && isGlobal) {
      data.isGlobal = true;
    } else {
      data.userId = req.user.id;
      if (req.user.organizationId) data.organizationId = req.user.organizationId;
    }

    const key = await prisma.aiProviderKey.create({ data });
    res.status(201).json({ ...key, apiKey: key.apiKey.slice(0, 8) + '...' + key.apiKey.slice(-4) });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar provider', details: err.message });
  }
});

// DELETE /api/ai/providers/:id
router.delete('/providers/:id', async (req, res) => {
  try {
    const key = await prisma.aiProviderKey.findUnique({ where: { id: req.params.id } });
    if (!key) return res.status(404).json({ error: 'Key não encontrada' });
    if (key.isGlobal && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    if (!key.isGlobal && key.userId !== req.user.id && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Sem permissão' });
    }
    await prisma.aiProviderKey.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover provider', details: err.message });
  }
});

// ========== CHAT COM IA ==========

// GET /api/ai/chats
router.get('/chats', async (req, res) => {
  try {
    const chats = await prisma.aiChat.findMany({
      where: { userId: req.user.id },
      include: {
        agent: { select: { name: true, category: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(chats);
  } catch (err) {
    console.error('AI chats disabled or table missing:', err.message);
    res.json([]);
  }
});

// POST /api/ai/chats
router.post('/chats', async (req, res) => {
  try {
    const { agentId, title } = req.body;
    const chat = await prisma.aiChat.create({
      data: { agentId, userId: req.user.id, title },
      include: { agent: { select: { name: true } } },
    });
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar chat', details: err.message });
  }
});

// GET /api/ai/chats/:id/messages
router.get('/chats/:id/messages', async (req, res) => {
  try {
    const messages = await prisma.aiChatMessage.findMany({
      where: { chatId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar mensagens', details: err.message });
  }
});

// POST /api/ai/chats/:id/messages - enviar mensagem e obter resposta da IA
router.post('/chats/:id/messages', async (req, res) => {
  try {
    const { content, model } = req.body;
    const chatId = req.params.id;

    // Buscar chat + agente + customização
    const chat = await prisma.aiChat.findUnique({
      where: { id: chatId },
      include: { agent: true },
    });
    if (!chat || chat.userId !== req.user.id) {
      return res.status(404).json({ error: 'Chat não encontrado' });
    }

    const customization = await prisma.aiAgentCustomization.findUnique({
      where: { agentId_userId: { agentId: chat.agentId, userId: req.user.id } },
    });

    // Salvar mensagem do usuário
    await prisma.aiChatMessage.create({ data: { chatId, role: 'user', content } });

    // Buscar histórico
    const history = await prisma.aiChatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    // Montar system prompt
    let systemPrompt = chat.agent.systemPrompt;
    if (customization?.additionalPrompt) {
      systemPrompt += `\n\nInstruções adicionais do profissional:\n${customization.additionalPrompt}`;
    }

    // Determinar modelo e key
    const selectedModel = model || customization?.preferredModel || chat.agent.defaultModel || 'gemini';
    const providerMap = { gemini: 'gemini', openai: 'openai', claude: 'claude' };
    const providerName = providerMap[selectedModel] || 'gemini';

    // Buscar API key (pessoal > org > global)
    const providerKey = await prisma.aiProviderKey.findFirst({
      where: {
        provider: providerName,
        OR: [
          { userId: req.user.id },
          ...(req.user.organizationId ? [{ organizationId: req.user.organizationId }] : []),
          { isGlobal: true },
        ],
      },
      orderBy: { isGlobal: 'asc' }, // pessoal primeiro
    });

    if (!providerKey) {
      return res.status(400).json({
        error: `Nenhuma API key configurada para ${providerName}. Configure nas configurações de IA.`,
      });
    }

    // Chamar a IA
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
    ];

    let aiResponse;
    try {
      aiResponse = await callAiProvider(providerName, providerKey.apiKey, messages, selectedModel);
    } catch (aiErr) {
      return res.status(500).json({ error: 'Erro ao chamar IA', details: aiErr.message });
    }

    // Salvar resposta
    const assistantMsg = await prisma.aiChatMessage.create({
      data: { chatId, role: 'assistant', content: aiResponse, model: selectedModel },
    });

    res.json(assistantMsg);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao processar mensagem', details: err.message });
  }
});

// POST /api/ai/analyze - analisar texto/anotação
router.post('/analyze', async (req, res) => {
  try {
    const { text, type, model, agentId } = req.body;

    let systemPrompt = 'Você é um assistente especializado em psicologia clínica. Analise o texto a seguir e forneça insights clínicos relevantes, padrões observados e sugestões de abordagem.';

    if (agentId) {
      const agent = await prisma.aiAgent.findUnique({ where: { id: agentId } });
      if (agent) systemPrompt = agent.systemPrompt;
    }

    if (type === 'prontuario') {
      systemPrompt += '\n\nFoco: Análise de prontuário clínico. Identifique padrões, progressos e áreas de atenção.';
    } else if (type === 'sessao') {
      systemPrompt += '\n\nFoco: Análise de notas de sessão. Identifique temas recorrentes, pontos de progresso e sugestões para próximas sessões.';
    }

    const selectedModel = model || 'gemini';
    const providerName = selectedModel === 'openai' ? 'openai' : selectedModel === 'claude' ? 'claude' : 'gemini';

    const providerKey = await prisma.aiProviderKey.findFirst({
      where: {
        provider: providerName,
        OR: [
          { userId: req.user.id },
          ...(req.user.organizationId ? [{ organizationId: req.user.organizationId }] : []),
          { isGlobal: true },
        ],
      },
      orderBy: { isGlobal: 'asc' },
    });

    if (!providerKey) {
      return res.status(400).json({ error: `Nenhuma API key configurada para ${providerName}` });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ];

    const analysis = await callAiProvider(providerName, providerKey.apiKey, messages, selectedModel);
    res.json({ analysis, model: selectedModel });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao analisar', details: err.message });
  }
});

// ========== HELPER: Chamar provedores de IA ==========
async function callAiProvider(provider, apiKey, messages, model) {
  let url, body, headers;

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    body = { model: model === 'openai' ? 'gpt-4o' : model, messages, max_tokens: 2000 };
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' };
    const system = messages.find(m => m.role === 'system')?.content || '';
    const msgs = messages.filter(m => m.role !== 'system');
    body = { model: model === 'claude' ? 'claude-sonnet-4-20250514' : model, max_tokens: 2000, system, messages: msgs };
  } else {
    // Gemini
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model === 'gemini' ? 'gemini-2.0-flash' : model}:generateContent?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
    const systemPart = messages.find(m => m.role === 'system')?.content || '';
    const parts = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    body = {
      systemInstruction: { parts: [{ text: systemPart }] },
      contents: parts,
      generationConfig: { maxOutputTokens: 2000 },
    };
  }

  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${provider} API error: ${JSON.stringify(data)}`);
  }

  if (provider === 'openai') return data.choices[0].message.content;
  if (provider === 'claude') return data.content[0].text;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta';
}

module.exports = router;
