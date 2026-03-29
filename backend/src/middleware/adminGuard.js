const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware que verifica se o usuário é superadmin
 */
async function superadminGuard(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, status: true }
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Conta desativada' });
    if (user.role !== 'superadmin') return res.status(403).json({ error: 'Acesso restrito a superadmin' });

    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro de autorização', details: err.message });
  }
}

/**
 * Middleware que verifica se o usuário é admin da organização ou superadmin
 */
async function adminGuard(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, status: true, organizationId: true }
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Conta desativada' });
    if (user.role !== 'superadmin' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }

    req.userRole = user.role;
    req.userOrgId = user.organizationId;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro de autorização', details: err.message });
  }
}

/**
 * Middleware que injeta dados do tenant (organização) na request
 */
async function tenantMiddleware(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, status: true, organizationId: true, organization: { select: { status: true } } }
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Sua conta está desativada' });

    // Superadmin não precisa de organização ativa
    if (user.role !== 'superadmin') {
      if (!user.organizationId) return res.status(403).json({ error: 'Usuário sem organização vinculada' });
      if (user.organization?.status !== 'active') {
        return res.status(403).json({ error: 'A organização está suspensa ou inativa. Contate o administrador.' });
      }
    }

    req.userRole = user.role;
    req.userOrgId = user.organizationId;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro de tenant', details: err.message });
  }
}

/**
 * Middleware que permite admin, superadmin ou professional
 */
async function professionalGuard(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true, status: true, organizationId: true }
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.status !== 'active') return res.status(403).json({ error: 'Conta desativada' });
    if (!['superadmin', 'admin', 'professional'].includes(user.role)) {
      return res.status(403).json({ error: 'Acesso restrito a profissionais e administradores' });
    }

    req.userRole = user.role;
    req.userOrgId = user.organizationId;
    next();
  } catch (err) {
    res.status(500).json({ error: 'Erro de autorização', details: err.message });
  }
}

module.exports = { superadminGuard, adminGuard, tenantMiddleware, professionalGuard };
