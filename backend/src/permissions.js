/**
 * Regras puras de autorização do modo Clínica.
 *
 * Este módulo não depende do Prisma para poder ser testado isoladamente.
 * A camada HTTP usa `backend/src/middleware/access.js` para carregar o contexto
 * do banco e chama as funções exportadas aqui.
 */

const CLINIC_ROLES = ['admin', 'professional', 'secretary', 'financial', 'supervisor'];
const OWNER_ROLES = ['admin', 'superadmin'];
const CLINICAL_READ_ROLES = ['professional', 'supervisor', 'admin', 'superadmin'];
const CLINICAL_WRITE_ROLES = ['professional', 'admin', 'superadmin'];
const AGENDA_MANAGE_ROLES = ['admin', 'superadmin', 'secretary', 'professional'];
const FINANCE_MANAGE_ROLES = ['admin', 'superadmin', 'financial'];

const CAPABILITIES = {
  'clinic:manage': [...OWNER_ROLES],
  'team:manage': [...OWNER_ROLES],
  'agenda:read': [...CLINIC_ROLES, 'superadmin'],
  'agenda:manage': AGENDA_MANAGE_ROLES,
  'patient:read': [...CLINIC_ROLES, 'superadmin'],
  'patient:manage': [...OWNER_ROLES, 'secretary', 'professional'],
  'record:read': CLINICAL_READ_ROLES,
  'record:write': CLINICAL_WRITE_ROLES,
  'finance:read': [...OWNER_ROLES, 'financial', 'professional', 'superadmin'],
  'finance:manage': FINANCE_MANAGE_ROLES,
  'payout:manage': [...OWNER_ROLES, 'financial', 'superadmin'],
  'audit:read': [...OWNER_ROLES, 'superadmin'],
};

function normalizeRole(role) {
  return role === 'psychologist' ? 'professional' : role;
}

function hasCapability(role, capability, permissions = []) {
  const normalized = normalizeRole(role);
  if (!CAPABILITIES[capability]) return false;
  if (CAPABILITIES[capability].includes(normalized)) return true;
  if (normalized === 'secretary_financial') {
    return ['finance:read', 'finance:manage', 'agenda:read', 'agenda:manage', 'patient:read'].includes(capability);
  }
  return permissions.includes(capability);
}

function canUseScope(context, scope) {
  const requested = scope || 'private';
  if (requested === 'private') return true;
  if (requested !== 'clinic') return false;
  if (!context || context.mode === 'individual') return false;
  if (context.mode === 'hybrid' || context.mode === 'clinic') return context.hasActiveClinicMember === true;
  return false;
}

function canAccessScope(context, capability, scope) {
  return hasCapability(context?.role, capability, context?.permissions) && canUseScope(context, scope);
}

function scopedWhere(context, capability, scope, baseWhere = {}, options = {}) {
  const requested = scope || 'private';
  if (!hasCapability(context?.role, capability, context?.permissions)) return null;
  if (!canUseScope(context, requested)) return null;

  const where = { ...baseWhere, scope: requested };
  const ownerRoles = [...OWNER_ROLES, 'financial', 'superadmin'];

  if (requested === 'private') {
    if (ownerRoles.includes(normalizeRole(context.role))) {
      if (!context.organizationId) return null;
      where.professional = { organizationId: context.organizationId };
    } else {
      where.professionalId = context.userId;
    }
    return where;
  }

  if (options.clinicOrganizationFilter !== false) {
    if (!context.organizationId) return null;
    where.organizationId = context.organizationId;
  }

  const role = normalizeRole(context.role);
  if (['admin', 'superadmin', 'financial', 'supervisor'].includes(role) && options.supervisorScope) {
    const ids = Array.isArray(context.supervisedProfessionalIds) ? context.supervisedProfessionalIds : [];
    if (!ids.includes(options.supervisorScope)) return null;
  }
  if (role === 'secretary' && options.secretaryBlocked === true) return null;
  if (role === 'professional' && options.professionalId && options.professionalId !== context.userId) return null;
  return where;
}

function assertProfessionalAllowed(context, requestedProfessionalId, options = {}) {
  const role = normalizeRole(context?.role);
  if (!requestedProfessionalId || requestedProfessionalId === 'all') {
    if (options.allowAll) return context.userId;
    return context?.userId || null;
  }
  if (requestedProfessionalId === context.userId) return context.userId;
  if (role === 'professional' && !['admin', 'superadmin'].includes(context?.accountRole)) return null;
  if (!hasCapability(role, options.capability || 'agenda:manage', context?.permissions)) return null;
  if (!context.organizationId) return null;
  if (Array.isArray(options.allowedProfessionalIds) && !options.allowedProfessionalIds.includes(requestedProfessionalId)) return null;
  return requestedProfessionalId;
}

function canAudit(context) {
  return hasCapability(context?.role, 'audit:read', context?.permissions);
}

function canManageClinic(context) {
  return canUseScope(context, 'clinic') && hasCapability(context?.role, 'clinic:manage', context?.permissions);
}

function hasPermission(context, capability) {
  return hasCapability(context?.role, capability, context?.permissions);
}

function effectivePermissions(context) {
  if (!context) return [];
  const values = new Set(context.permissions || []);
  for (const [capability, roles] of Object.entries(CAPABILITIES)) {
    if (roles.includes(normalizeRole(context.role))) values.add(capability);
  }
  return [...values];
}

module.exports = {
  CAPABILITIES,
  CLINIC_ROLES,
  assertProfessionalAllowed,
  canAccessScope,
  canAudit,
  canManageClinic,
  canUseScope,
  effectivePermissions,
  hasCapability,
  hasPermission,
  normalizeRole,
  scopedWhere,
};
