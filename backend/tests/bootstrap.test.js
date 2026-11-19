const test = require('node:test');
const assert = require('node:assert/strict');
const { hasCapability } = require('../src/permissions');

test('administrador da organização pode ativar o modo clínico sem vínculo prévio', () => {
  const context = {
    role: 'admin',
    accountRole: 'admin',
    hasActiveClinicMember: false,
    organizationId: 'org-1',
  };
  assert.equal(hasCapability(context.accountRole, 'clinic:manage'), true);
  assert.equal(hasCapability(context.role, 'team:manage'), true);
});

test('professional não pode ativar o modo clínico', () => {
  assert.equal(hasCapability('professional', 'clinic:manage'), false);
});
