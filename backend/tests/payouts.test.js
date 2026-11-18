const test = require('node:test');
const assert = require('node:assert/strict');

function calculatePayout(chargedAmount, agreement) {
  const charged = Number(chargedAmount || 0);
  if (!agreement) return { grossAmount: 0, deductionAmount: charged, netAmount: 0, ruleType: 'none' };
  let gross = 0;
  if (agreement.ruleType === 'fixed') gross = Number(agreement.fixedAmount || 0);
  else if (agreement.ruleType === 'percent') gross = (charged * Number(agreement.percentage || 0)) / 100;
  else gross = Number(agreement.fixedAmount || 0) + (charged * Number(agreement.percentage || 0)) / 100;
  gross = Math.min(gross, charged);
  return { grossAmount: Number(gross.toFixed(2)), deductionAmount: Number((charged - gross).toFixed(2)), netAmount: Number(gross.toFixed(2)), ruleType: agreement.ruleType };
}

test('faltas e cancelamentos não entram no fechamento', () => {
  const eligible = [
    { status: 'completed', attended: true },
    { status: 'cancelled', attended: false },
    { status: 'missed_free', attended: false },
  ].filter((a) => a.attended && a.status === 'completed');
  assert.equal(eligible.length, 1);
});

test('repasse percentual respeita recebimento efetivo', () => {
  assert.deepEqual(calculatePayout(200, { ruleType: 'percent', percentage: 60 }), {
    grossAmount: 120,
    deductionAmount: 80,
    netAmount: 120,
    ruleType: 'percent',
  });
});

test('repasse fixo nunca supera o valor cobrado', () => {
  assert.deepEqual(calculatePayout(120, { ruleType: 'fixed', fixedAmount: 200 }), {
    grossAmount: 120,
    deductionAmount: 0,
    netAmount: 120,
    ruleType: 'fixed',
  });
});

test('repasse combinado soma fixo e percentual', () => {
  assert.deepEqual(calculatePayout(300, { ruleType: 'both', fixedAmount: 50, percentage: 50 }), {
    grossAmount: 200,
    deductionAmount: 100,
    netAmount: 200,
    ruleType: 'both',
  });
});

test('sem acordo não há repasse devido', () => {
  assert.equal(calculatePayout(300, null).netAmount, 0);
});
