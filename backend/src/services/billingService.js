const prisma = require('../db');

function appointmentIdsFromNotes(notes = '') {
  return [...String(notes).matchAll(/appointment_id:([a-zA-Z0-9_-]+)/gi)].map((match) => match[1]);
}

function sessionIdsFromNotes(notes = '') {
  return [...String(notes).matchAll(/session_ids:([a-zA-Z0-9_-]+(?:,[a-zA-Z0-9_-]+)*)/gi)]
    .flatMap((match) => match[1].split(',').filter(Boolean));
}

function hasAppointmentLink(notes, appointmentId) {
  return appointmentIdsFromNotes(notes).includes(appointmentId)
    || sessionIdsFromNotes(notes).includes(appointmentId);
}

/** Valor padrão de uma sessão, conforme o modo de cobrança do paciente. */
function sessionBillingValue(appointment, patient) {
  if (patient?.billingMode === 'monthly') return 0;
  return patient?.sessionValue
    ? Number(patient.sessionValue)
    : (appointment?.value ? Number(appointment.value) : 0);
}

/**
 * Conta a receber gerada automaticamente para uma sessão realizada.
 * Pacientes mensais não geram cobrança por sessão.
 */
async function ensureReceivableForAppointment(appointment, professionalId, prismaClient = prisma) {
  if (!appointment?.patientId || !appointment?.patient) return null;
  if (appointment.patient.billingMode === 'monthly') return null;

  const candidates = await prismaClient.account.findMany({
    where: {
      professionalId,
      patientId: appointment.patientId,
      type: 'receivable',
      OR: [
        { notes: { contains: `appointment_id:${appointment.id}` } },
        { notes: { contains: 'session_ids:' } },
      ],
    },
    select: { id: true, notes: true },
  });
  const existing = candidates.find((account) => hasAppointmentLink(account.notes, appointment.id));
  if (existing) return null;

  const value = sessionBillingValue(appointment, appointment.patient);
  if (!value || value <= 0) return null;

  const organizationId = appointment.professional?.organizationId
    || appointment.organizationId
    || undefined;

  return prismaClient.account.create({
    data: {
      professionalId,
      organizationId,
      scope: appointment.scope || 'private',
      type: 'receivable',
      description: `Sessão - ${appointment.patient.name} - ${new Date(appointment.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`,
      value,
      dueDate: appointment.date,
      category: 'Consulta',
      patientId: appointment.patientId,
      status: 'pending',
      notes: `appointment_id:${appointment.id}`,
    },
  });
}

/**
 * Remove somente cobranças ainda não pagas ligadas à sessão, inclusive as que
 * foram agrupadas em uma fatura. Em faturas com mais sessões, ajusta o valor.
 */
async function removeReceivableForAppointment(appointmentId, professionalId, value, prismaClient = prisma) {
  const candidates = await prismaClient.account.findMany({
    where: {
      professionalId,
      type: 'receivable',
      status: { not: 'paid' },
      OR: [
        { notes: { contains: `appointment_id:${appointmentId}` } },
        { notes: { contains: 'session_ids:' } },
      ],
    },
    select: { id: true, notes: true, value: true },
  });

  for (const account of candidates) {
    if (!hasAppointmentLink(account.notes, appointmentId)) continue;
    const ids = [...new Set([
      ...appointmentIdsFromNotes(account.notes),
      ...sessionIdsFromNotes(account.notes),
    ])].filter((id) => id !== appointmentId);

    if (ids.length === 0) {
      await prismaClient.account.delete({ where: { id: account.id } });
      continue;
    }
    const removedValue = Number(value) || 0;
    const newValue = Number(account.value) - removedValue;
    await prismaClient.account.update({
      where: { id: account.id },
      data: {
        notes: `session_ids:${ids.join(',')}`,
        value: newValue > 0 ? newValue : Number(account.value),
      },
    });
  }
}

/**
 * Sincroniza o status de pagamento da sessão quando a conta a receber é baixada.
 */
async function syncAppointmentPaymentStatus(account, prismaClient = prisma) {
  if (account.type !== 'receivable' || !account.notes) return;
  const ids = [
    ...appointmentIdsFromNotes(account.notes),
    ...sessionIdsFromNotes(account.notes),
  ];
  if (!ids.length) return;
  await prismaClient.appointment.updateMany({
    where: { id: { in: ids } },
    data: { paymentStatus: account.status === 'paid' ? 'paid' : 'pending' },
  });
}

module.exports = {
  appointmentIdsFromNotes,
  sessionIdsFromNotes,
  hasAppointmentLink,
  ensureReceivableForAppointment,
  removeReceivableForAppointment,
  sessionBillingValue,
  syncAppointmentPaymentStatus,
};
