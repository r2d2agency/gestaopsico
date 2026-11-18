const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canUseScope,
  hasCapability,
  scopedWhere,
  assertProfessionalAllowed,
} = require('../src/permissions');

const adminContext = {
  userId: 'owner-1',
  organizationId: 'org-1',
  role: 'admin',
  mode: 'clinic',
  hasActiveClinicMember: true,
  permissions: [],
};

const secretaryContext = {
  ...adminContext,
  userId: 'secretary-1',
  role: 'secretary',
};

const professionalContext = {
  ...adminContext,
  userId: 'pro-1',
  role: 'professional',
};

const outsideContext = {
  ...professionalContext,
  organizationId: null,
};

test('escopo particular é sempre permitido', () => {
  assert.equal(canUseScope(outsideContext, 'private'), true);
});

test('escopo clínica exige modo clínico e vínculo ativo', () => {
  assert.equal(canUseScope({ ...adminContext, mode: 'individual' }, 'clinic'), false);
  assert.equal(canUseScope({ ...adminContext, hasActiveClinicMember: false }, 'clinic'), false);
  assert.equal(canUseScope(adminContext, 'clinic'), true);
  assert.equal(canUseScope(adminContext, 'unknown'), false);
});

test('secretaria não possui capacidade de leitura de prontuário', () => {
  assert.equal(hasCapability('secretary', 'record:read'), false);
  assert.equal(hasCapability('secretary_financial', 'finance:manage'), true);
  assert.equal(hasCapability('professional', 'record:read'), true);
});

test('filtro de escopo clínica é limitado à organização', () => {
  const where = scopedWhere(adminContext, 'agenda:read', 'clinic', { status: 'scheduled' });
  assert.deepEqual(where, {
    status: 'scheduled',
    scope: 'clinic',
    organizationId: 'org-1',
  });
});

test('filtro de agenda de secretaria bloqueia prontuário', () => {
  assert.equal(scopedWhere(secretaryContext, 'record:read', 'clinic'), null);
});

test('profissional não consulta agenda de outro profissional', () => {
  assert.equal(
    assertProfessionalAllowed(professionalContext, 'pro-2', { capability: 'agenda:manage' }),
    null,
  );
  assert.equal(
    assertProfessionalAllowed(professionalContext, 'pro-1', { capability: 'agenda:manage' }),
    'pro-1',
  );
});

test('administrador pode consultar profissional da própria organização', () => {
  assert.equal(
    assertProfessionalAllowed(adminContext, 'pro-2', {
      capability: 'agenda:manage',
      allowedProfessionalIds: ['pro-2'],
    }),
    'pro-2',
  );
  assert.equal(
    assertProfessionalAllowed(adminContext, 'pro-3', {
      capability: 'agenda:manage',
      allowedProfessionalIds: ['pro-2'],
    }),
    null,
  );
});

test('filtro particular de profissional usa apenas seu próprio ID', () => {
  assert.deepEqual(scopedWhere(professionalContext, 'agenda:read', 'private'), {
    scope: 'private',
    professionalId: 'pro-1',
  });
});
