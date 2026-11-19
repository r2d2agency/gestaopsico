const prisma = require('../db');
const { effectivePermissions, hasPermission, canUseScope } = require('../permissions');

function deny(res, status, error) {
  return res.status(status).json({ error });
}

/**
 * Carrega o contexto de autorização usado por todas as rotas do modo Clínica.
 * Deve ser registrado depois de `authMiddleware`.
 */
async function loadAccess(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        role: true,
        status: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            mode: true,
            status: true,
            plan: true,
            planId: true,
            planRef: { select: { id: true, name: true, slug: true, hasClinicMode: true } },
          },
        },
      },
    });

    if (!user) return deny(res, 404, 'Usuário não encontrado');
    if (user.status !== 'active') return deny(res, 403, 'Conta desativada');
    if (user.role !== 'superadmin' && user.organization?.status !== 'active') {
      return deny(res, 403, 'Organização inativa ou suspensa');
    }

    let planRef = user.organization?.planRef || null;
    if (!planRef && user.organization?.plan) {
      planRef = await prisma.plan.findFirst({
        where: { slug: user.organization.plan },
        select: { id: true, name: true, slug: true, hasClinicMode: true },
      });
    }

    let clinicMember = null;
    if (user.organizationId) {
      clinicMember = await prisma.clinicMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: user.organizationId,
            userId: user.id,
          },
        },
        select: {
          id: true,
          role: true,
          status: true,
          permissions: true,
          supervisorId: true,
        },
      });
    }

    const activeClinicMember = clinicMember?.status === 'active' ? clinicMember : null;
    const role = activeClinicMember?.role || user.role;
    const context = {
      userId: user.id,
      organizationId: user.organizationId,
      role,
      accountRole: user.role,
      mode: user.organization?.mode || 'individual',
      plan: planRef || null,
      canActivateClinic: planRef?.hasClinicMode === true,
      hasActiveClinicMember: Boolean(activeClinicMember),
      permissions: activeClinicMember?.permissions || [],
      supervisorId: activeClinicMember?.supervisorId || null,
      supervisedProfessionalIds: [],
    };

    if (activeClinicMember?.role === 'supervisor' && user.organizationId) {
      const supervised = await prisma.clinicMember.findMany({
        where: {
          organizationId: user.organizationId,
          supervisorId: user.id,
          status: 'active',
        },
        select: { userId: true },
      });
      context.supervisedProfessionalIds = supervised.map((item) => item.userId);
    }

    req.access = context;
    req.userRole = context.role;
    req.userOrgId = context.organizationId;
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Erro de autorização', details: err.message });
  }
}

function requireCapability(capability) {
  return (req, res, next) => {
    if (!hasPermission(req.access, capability)) return deny(res, 403, 'Sem permissão para esta ação');
    return next();
  };
}

function requireClinicMember(req, res, next) {
  if (!req.access?.hasActiveClinicMember) return deny(res, 403, 'Vínculo ativo com a clínica necessário');
  if (!canUseScope(req.access, 'clinic')) return deny(res, 403, 'Organização não opera em modo clínico');
  return next();
}

function requireScope(...scopes) {
  return (req, res, next) => {
    const requested = req.query?.scope || req.body?.scope || req.params?.scope || scopes[0] || 'private';
    if (!scopes.includes(requested)) return deny(res, 400, 'Escopo inválido');
    if (!canUseScope(req.access, requested)) return deny(res, 403, 'Escopo não permitido para este usuário');
    req.scope = requested;
    return next();
  };
}

function requireAnyCapability(...capabilities) {
  return (req, res, next) => {
    if (!capabilities.some((capability) => hasPermission(req.access, capability))) {
      return deny(res, 403, 'Sem permissão para esta ação');
    }
    return next();
  };
}

module.exports = {
  deny,
  loadAccess,
  requireAnyCapability,
  requireCapability,
  requireClinicMember,
  requireScope,
};
