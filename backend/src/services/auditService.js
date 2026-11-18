const prisma = require('../db');

async function logAudit(req, action, entityType, entityId, details) {
  try {
    const actorId = req?.access?.userId || req?.userId || null;
    const organizationId = req?.access?.organizationId || req?.userOrgId || null;
    const ipAddress = req?.ip || req?.socket?.remoteAddress || null;
    await prisma.auditEvent.create({
      data: {
        organizationId,
        actorId,
        action,
        entityType,
        entityId: entityId || null,
        details: details === undefined ? undefined : details,
        ipAddress,
      },
    });
  } catch (err) {
    console.error('Falha ao registrar evento de auditoria:', err.message);
  }
}

module.exports = { logAudit };
