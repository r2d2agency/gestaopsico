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
