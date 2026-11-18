const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { loadAccess, requireCapability } = require('../middleware/access');

const router = express.Router();
const prisma = require('../db');

router.use(authMiddleware);
router.use(loadAccess);
router.use(requireCapability('audit:read'));

router.get('/', async (req, res) => {
  try {
    const { entityType, entityId, action } = req.query;
    const where = { organizationId: req.access.organizationId || undefined };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar auditoria', details: err.message });
  }
});

module.exports = router;
