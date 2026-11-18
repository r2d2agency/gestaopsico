const test = require('node:test');
const assert = require('node:assert/strict');
const { createAccessService } = require('../src/services/accessService');

function context(overrides = {}) {
  return {
    userId: 'pro-1',
    organizationId: 'org-1',
    role: 'professional',
    accountRole: 'professional',
    mode: 'clinic',
    hasActiveClinicMember: true,
    permissions: [],
    supervisedProfessionalIds: [],
    ...overrides,
  };
}

function fakeDb(overrides = {}) {
  return {
    user: {
      findFirst: async () => ({ id: 'pro-2', role: 'professional' }),
    },
    clinicMember: {
      findFirst: async () => ({ id: 'member-2' }),
    },
    patient: {
      findFirst: async () => ({ id: 'patient-1', professionalId: 'pro-2', scope: 'clinic' }),
    },
    appointment: {
      findFirst: async () => ({ id: 'apt-1', professionalId: 'pro-2', scope: 'clinic', patientId: 'patient-1' }),
    },
    record: {
      findFirst: async () => ({ id: 'record-1', professionalId: 'pro-2', scope: 'clinic', patientId: 'patient-1' }),
    },
    organization: {
      findUnique: async () => ({ id: 'org-1' }),
    },
    ...overrides,
  };
}

test('resolveProfessionalId rejeita profissional de outra organização', async () => {
  const service = createAccessService(fakeDb({
    user: { findFirst: async () => null },
  }));
  const result = await service.resolveProfessionalId(context(), 'pro-2', 'agenda:manage');
  assert.equal(result, null);
});

test('resolveProfessionalId rejeita profissional sem vínculo clínico ativo', async () => {
  const service = createAccessService(fakeDb({
    clinicMember: { findFirst: async () => null },
  }));
  const result = await service.resolveProfessionalId(context({ role: 'admin', accountRole: 'admin' }), 'pro-2', 'agenda:manage');
  assert.equal(result, null);
});

test('resolveProfessionalId aceita profissional validado', async () => {
  const service = createAccessService(fakeDb());
  const result = await service.resolveProfessionalId(context({ role: 'admin', accountRole: 'admin' }), 'pro-2', 'agenda:manage');
  assert.equal(result, 'pro-2');
});

test('secretaria não acessa prontuário clínico', async () => {
  const service = createAccessService(fakeDb());
  const result = await service.canAccessRecord(context({ role: 'secretary', accountRole: 'secretary' }), 'record-1');
  assert.equal(result, null);
});

test('supervisor só acessa prontuário de profissionais supervisionados', async () => {
  const service = createAccessService(fakeDb());
  const supervisor = context({
    role: 'supervisor',
    accountRole: 'supervisor',
    supervisedProfessionalIds: ['pro-3'],
  });
  assert.equal(await service.canAccessRecord(supervisor, 'record-1'), null);

  const allowed = context({
    role: 'supervisor',
    accountRole: 'supervisor',
    supervisedProfessionalIds: ['pro-2'],
  });
  assert.equal((await service.canAccessRecord(allowed, 'record-1')).id, 'record-1');
});

test('prontuário particular de outro profissional é negado', async () => {
  const service = createAccessService(fakeDb({
    record: { findFirst: async () => ({ id: 'record-1', professionalId: 'pro-2', scope: 'private' }) },
  }));
  assert.equal(await service.canAccessRecord(context(), 'record-1'), null);
});

test('paciente clínico sem vínculo e sem permissão é negado', async () => {
  const service = createAccessService(fakeDb({
    patientClinicLink: { findFirst: async () => null },
  }));
  assert.equal(await service.canAccessPatient(context(), 'patient-1'), null);
});

test('usuário sem vínculo clínico não usa escopo clínico', async () => {
  const service = createAccessService(fakeDb());
  const result = await service.canAccessAppointment(context({ hasActiveClinicMember: false }), 'apt-1');
  assert.equal(result, null);
});
