const express = require('express');

const { authMiddleware } = require('../middleware/auth');
const { superadminGuard } = require('../middleware/adminGuard');

const router = express.Router();
const prisma = require('../db');

// Professionals list endpoint - accessible to secretary/admin without superadmin guard
router.get('/professionals', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { organizationId: true } });
    const where = { role: { in: ['professional', 'psychologist'] }, status: 'active' };
    if (user?.organizationId) where.organizationId = user.organizationId;
    const professionals = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' }
    });
    res.json(professionals);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar profissionais' });
  }
});

router.use(authMiddleware);
router.use(superadminGuard);

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map = {};
    settings.forEach(s => { map[s.key] = s.value; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// PUT /api/settings/:key
router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ error: 'Valor é obrigatório' });

    const setting = await prisma.systemSetting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value: String(value) },
      update: { value: String(value) }
    });
    res.json(setting);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar configuração', details: err.message });
  }
});

// POST /api/settings/wapi/create-instance
router.post('/wapi/create-instance', async (req, res) => {
  try {
    const tokenSetting = await prisma.systemSetting.findUnique({ where: { key: 'wapi_token' } });
    if (!tokenSetting?.value) {
      return res.status(400).json({ error: 'Token W-API não configurado. Configure em Configurações.' });
    }

    const { instanceName, callMessage } = req.body;
    if (!instanceName) return res.status(400).json({ error: 'Nome da instância é obrigatório' });

    const response = await fetch('https://api.w-api.app/v1/integrator/create-instance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenSetting.value}`
      },
      body: JSON.stringify({
        instanceName,
        rejectCalls: false,
        callMessage: callMessage || 'Não estamos disponíveis no momento.'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erro na W-API', details: data });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar instância', details: err.message });
  }
});

module.exports = router;
