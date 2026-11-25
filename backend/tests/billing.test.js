const test = require('node:test');
const assert = require('node:assert/strict');
const {
  appointmentIdsFromNotes,
  sessionIdsFromNotes,
  hasAppointmentLink,
  sessionBillingValue,
  ensureReceivableForAppointment,
  removeReceivableForAppointment,
  syncAppointmentPaymentStatus,
} = require('../src/services/billingService');

function fakeDb(overrides = {}) {
  return {
    account: {
      findMany: overrides.account?.findMany || (async () => []),
      findFirst: overrides.account?.findFirst || (async () => null),
      create: overrides.account?.create || (async ({ data }) => ({ id: 'account-1', ...data })),
      delete: overrides.account?.delete || (async () => {}),
      update: overrides.account?.update || (async ({ data }) => ({ id: 'account-1', ...data })),
    },
    appointment: {
      updateMany: overrides.appointment?.updateMany || (async () => ({ count: 0 })),
    },
  };
}

test('extrai IDs de cobrança individual e agrupada', () => {
  assert.deepEqual(appointmentIdsFromNotes('appointment_id:abc-123'), ['abc-123']);
  assert.deepEqual(sessionIdsFromNotes('session_ids:abc-123,def-456'), ['abc-123', 'def-456']);
  assert.equal(hasAppointmentLink('session_ids:abc-123,def-456', 'def-456'), true);
  assert.equal(hasAppointmentLink('appointment_id:abc-123', 'outro'), false);
});

test('valor por sessão respeita o modo de cobrança do paciente', () => {
  assert.equal(sessionBillingValue({ value: 200 }, { billingMode: 'monthly', sessionValue: 100 }), 0);
  assert.equal(sessionBillingValue({ value: 200 }, { billingMode: 'per_session', sessionValue: 100 }), 100);
  assert.equal(sessionBillingValue({ value: 200 }, { billingMode: 'per_session' }), 200);
});

test('paciente mensal não gera conta por sessão', async () => {
  const created = await ensureReceivableForAppointment({
    id: 'apt-1',
    patientId: 'patient-1',
    patient: { id: 'patient-1', name: 'Maria', billingMode: 'monthly', sessionValue: 100 },
    date: new Date('2026-11-01'),
    scope: 'clinic',
  }, 'pro-1', fakeDb());
  assert.equal(created, null);
});

test('não duplica cobrança de sessão já presente em fatura', async () => {
  const db = fakeDb({
    account: {
      findMany: async () => [{ id: 'conta-1', notes: 'session_ids:apt-1,apt-2' }],
    },
  });
  const created = await ensureReceivableForAppointment({
    id: 'apt-1',
    patientId: 'patient-1',
    patient: { id: 'patient-1', name: 'Maria', billingMode: 'per_session', sessionValue: 100 },
    date: new Date('2026-11-01'),
    scope: 'clinic',
  }, 'pro-1', db);
  assert.equal(created, null);
});

test('conta clínica recebe organizationId do profissional', async () => {
  const created = await ensureReceivableForAppointment({
    id: 'apt-1',
    patientId: 'patient-1',
    patient: { id: 'patient-1', name: 'Maria', billingMode: 'per_session', sessionValue: 100 },
    professional: { organizationId: 'org-1' },
    date: new Date('2026-11-01'),
    scope: 'clinic',
  }, 'pro-1', fakeDb());
  assert.equal(created.organizationId, 'org-1');
  assert.equal(created.scope, 'clinic');
});

test('remove conta individual pendente ao desfazer sessão', async () => {
  const deleted = [];
  const db = fakeDb({
    account: {
      findMany: async () => [{ id: 'conta-1', notes: 'appointment_id:apt-1', value: 100 }],
      delete: async ({ where }) => deleted.push(where.id),
    },
  });
  await removeReceivableForAppointment('apt-1', 'pro-1', 100, db);
  assert.deepEqual(deleted, ['conta-1']);
});

test('não remove conta já paga ao desfazer sessão', async () => {
  const db = fakeDb({
    account: {
      findMany: async () => [],
    },
  });
  const deleted = [];
  db.account.findMany = async ({ where }) => {
    assert.equal(where.status.not, 'paid');
    return [];
  };
  db.account.delete = async ({ where }) => deleted.push(where.id);
  await removeReceivableForAppointment('apt-1', 'pro-1', 100, db);
  assert.equal(deleted.length, 0);
});

test('fatura com várias sessões é ajustada ao remover uma', async () => {
  let update;
  const db = fakeDb({
    account: {
      findMany: async () => [{ id: 'conta-1', notes: 'session_ids:apt-1,apt-2', value: 200 }],
      update: async (args) => { update = args; },
    },
  });
  await removeReceivableForAppointment('apt-1', 'pro-1', 100, db);
  assert.equal(update.data.notes, 'session_ids:apt-2');
  assert.equal(update.data.value, 100);
});

test('baixa de conta sincroniza paymentStatus da consulta', async () => {
  let update;
  const db = fakeDb({
    appointment: {
      updateMany: async (args) => { update = args; },
    },
  });
  await syncAppointmentPaymentStatus({ type: 'receivable', notes: 'appointment_id:apt-1', status: 'paid' }, db);
  assert.deepEqual(update.where.id.in, ['apt-1']);
  assert.equal(update.data.paymentStatus, 'paid');
});
