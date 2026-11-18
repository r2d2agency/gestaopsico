const defaultPrisma = require('../db');
const { canAccessScope, hasPermission } = require('../permissions');

/**
 * Cria os serviços de acesso com um cliente Prisma injetável. A injeção permite
 * testar negações de acesso sem banco de dados real.
 */
function createAccessService(prisma = defaultPrisma) {
  /**
   * Resolve um ID de profissional enviado pelo cliente. Nunca confia no valor
   * recebido sem verificar organização, vínculo ativo e papel do solicitante.
   */
  async function resolveProfessionalId(context, requestedId, capability = 'agenda:manage') {
    if (!hasPermission(context, capability)) return null;
    if (!requestedId || requestedId === 'all' || requestedId === context.userId) return context.userId;

    const where = { id: requestedId, status: 'active' };
    if (context.organizationId) where.organizationId = context.organizationId;

    const professional = await prisma.user.findFirst({
      where,
      select: { id: true, role: true },
    });
    if (!professional) return null;

    if (context.hasActiveClinicMember && context.organizationId) {
      const member = await prisma.clinicMember.findFirst({
        where: {
          organizationId: context.organizationId,
          userId: requestedId,
          status: 'active',
        },
        select: { id: true },
      });
      if (!member) return null;
    }
    return requestedId;
  }

  async function canAccessPatient(context, patientId, capability = 'patient:read') {
    const patient = await prisma.patient.findFirst({
      where: { id: patientId },
      select: { id: true, professionalId: true, scope: true },
    });
    if (!patient || !canAccessScope(context, capability, patient.scope)) return null;

    if (patient.scope === 'private') return patient;

    if (context.hasActiveClinicMember && context.organizationId) {
      const link = await prisma.patientClinicLink.findFirst({
        where: {
          organizationId: context.organizationId,
          patientId,
          professionalId: context.userId,
          validUntil: null,
        },
      });
      if (link) return patient;
    }

    if (!hasPermission(context, 'patient:read') || context.role === 'secretary') return null;
    if (patient.professionalId === context.userId) return patient;
    return ['admin', 'superadmin', 'financial', 'supervisor'].includes(context.role) ? patient : null;
  }

  async function canAccessAppointment(context, appointmentId, capability = 'agenda:read') {
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId },
      select: { id: true, professionalId: true, scope: true, patientId: true },
    });
    if (!appointment || !canAccessScope(context, capability, appointment.scope)) return null;

    if (appointment.scope === 'private') {
      return appointment.professionalId === context.userId ? appointment : null;
    }
    if (context.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: context.organizationId },
        select: { id: true },
      });
      if (!org) return null;
    }
    return appointment;
  }

  async function canAccessRecord(context, recordId, capability = 'record:read') {
    const record = await prisma.record.findFirst({
      where: { id: recordId },
      select: {
        id: true,
        professionalId: true,
        scope: true,
        patientId: true,
        appointmentId: true,
      },
    });
    if (!record || !canAccessScope(context, capability, record.scope)) return null;

    if (record.scope === 'private') {
      return record.professionalId === context.userId ? record : null;
    }
    if (record.professionalId === context.userId) return record;

    if (context.role === 'supervisor' && context.organizationId) {
      if (!context.supervisedProfessionalIds?.includes(record.professionalId)) return null;
      return record;
    }
    if (['admin', 'superadmin'].includes(context.role) && context.organizationId) return record;
    return null;
  }

  return {
    canAccessAppointment,
    canAccessPatient,
    canAccessRecord,
    resolveProfessionalId,
  };
}

const defaultService = createAccessService();

module.exports = {
  ...defaultService,
  createAccessService,
};
