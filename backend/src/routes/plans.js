const express = require('express');

const { authMiddleware } = require('../middleware/auth');
const { superadminGuard } = require('../middleware/adminGuard');

const router = express.Router();
const prisma = require('../db');

// GET /api/plans (public - for registration)
router.get('/', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar planos', details: err.message });
  }
});

// === Admin routes ===
router.use(authMiddleware);
router.use(superadminGuard);

// GET /api/plans/admin (all plans including inactive)
router.get('/admin', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
      include: { _count: { select: { organizations: true } } }
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar planos' });
  }
});

// POST /api/plans
router.post('/', async (req, res) => {
  try {
    const { name, slug, description, price, priceWithAi, maxPatients, maxUsers, maxPsychologists, trialDays, hasAiSecretary, hasWhatsapp, isRecommended, features } = req.body;
    if (!name || !slug || price === undefined) {
      return res.status(400).json({ error: 'Nome, slug e preço são obrigatórios' });
    }
    const plan = await prisma.plan.create({
      data: {
        name, slug, description,
        price: parseFloat(price),
        priceWithAi: priceWithAi ? parseFloat(priceWithAi) : null,
        maxPatients: maxPatients || 10,
        maxUsers: maxUsers || 1,
        maxPsychologists: maxPsychologists || 1,
        trialDays: trialDays || 7,
        hasAiSecretary: hasAiSecretary || false,
        hasWhatsapp: hasWhatsapp || false,
        isRecommended: isRecommended || false,
        features: features || []
      }
    });
    res.status(201).json(plan);
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Slug já existe' });
    res.status(500).json({ error: 'Erro ao criar plano', details: err.message });
  }
});

// PUT /api/plans/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, slug, description, price, priceWithAi, maxPatients, maxUsers, maxPsychologists, trialDays, hasAiSecretary, hasWhatsapp, isRecommended, isActive, features } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseFloat(price);
    if (priceWithAi !== undefined) data.priceWithAi = priceWithAi ? parseFloat(priceWithAi) : null;
    if (maxPatients !== undefined) data.maxPatients = parseInt(maxPatients);
    if (maxUsers !== undefined) data.maxUsers = parseInt(maxUsers);
    if (maxPsychologists !== undefined) data.maxPsychologists = parseInt(maxPsychologists);
    if (trialDays !== undefined) data.trialDays = parseInt(trialDays);
    if (hasAiSecretary !== undefined) data.hasAiSecretary = hasAiSecretary;
    if (hasWhatsapp !== undefined) data.hasWhatsapp = hasWhatsapp;
    if (isRecommended !== undefined) data.isRecommended = isRecommended;
    if (isActive !== undefined) data.isActive = isActive;
    if (features !== undefined) data.features = features;

    const plan = await prisma.plan.update({ where: { id: req.params.id }, data });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar plano', details: err.message });
  }
});

// DELETE /api/plans/:id
router.delete('/:id', async (req, res) => {
  try {
    const orgs = await prisma.organization.count({ where: { planId: req.params.id } });
    if (orgs > 0) {
      return res.status(400).json({ error: `Plano vinculado a ${orgs} organizações. Desative-o ao invés de excluir.` });
    }
    await prisma.plan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Plano removido' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover plano' });
  }
});

module.exports = router;
