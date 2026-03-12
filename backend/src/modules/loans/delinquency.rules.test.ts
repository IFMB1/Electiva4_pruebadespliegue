import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateLoanDelinquency, type DelinquencyConfig } from './delinquency.rules';

const NOW = new Date('2026-03-11T12:00:00.000Z');

function buildConfig(overrides: Partial<DelinquencyConfig> = {}): DelinquencyConfig {
  return {
    dailyRate: 1,
    gracePeriodHours: 0,
    punishmentThresholdDays: 45,
    ...overrides,
  };
}

function installment(params: {
  id: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
}) {
  return {
    id: params.id,
    dueDate: new Date(params.dueDate),
    amount: params.amount,
    paidAmount: params.paidAmount ?? 0,
  };
}

test('no aplica mora si no hay plazos vencidos', () => {
  const result = evaluateLoanDelinquency({
    now: NOW,
    config: buildConfig({ dailyRate: 2 }),
    installments: [
      installment({
        id: 'inst-1',
        dueDate: '2026-03-12T12:00:00.000Z',
        amount: 100,
      }),
    ],
  });

  assert.equal(result.overdueDays, 0);
  assert.equal(result.moraAmount, 0);
  assert.equal(result.trafficLight, 'GREEN');
  assert.equal(result.shouldPunish, false);
  assert.deepEqual(result.overdueInstallmentIds, []);
});

test('aplica mora cuando hay atraso y mantiene estado amarillo en atraso moderado', () => {
  const result = evaluateLoanDelinquency({
    now: NOW,
    config: buildConfig({ dailyRate: 2 }),
    installments: [
      installment({
        id: 'inst-1',
        dueDate: '2026-03-06T12:00:00.000Z',
        amount: 100,
      }),
    ],
  });

  assert.equal(result.overdueDays, 5);
  assert.equal(result.moraAmount, 10);
  assert.equal(result.trafficLight, 'YELLOW');
  assert.equal(result.shouldPunish, false);
  assert.deepEqual(result.overdueInstallmentIds, ['inst-1']);
});

test('respeta el periodo de gracia antes de considerar mora', () => {
  const result = evaluateLoanDelinquency({
    now: NOW,
    config: buildConfig({ dailyRate: 2, gracePeriodHours: 6 }),
    installments: [
      installment({
        id: 'inst-1',
        dueDate: '2026-03-11T08:00:00.000Z',
        amount: 100,
      }),
    ],
  });

  assert.equal(result.overdueDays, 0);
  assert.equal(result.moraAmount, 0);
  assert.equal(result.shouldPunish, false);
});

test('la mora usa el saldo pendiente real de cada plazo (incluye parciales)', () => {
  const result = evaluateLoanDelinquency({
    now: NOW,
    config: buildConfig({ dailyRate: 1.5 }),
    installments: [
      installment({
        id: 'inst-1',
        dueDate: '2026-03-01T12:00:00.000Z',
        amount: 100,
        paidAmount: 60,
      }),
      installment({
        id: 'inst-2',
        dueDate: '2026-03-09T12:00:00.000Z',
        amount: 50,
      }),
    ],
  });

  assert.equal(result.overdueDays, 10);
  assert.equal(result.moraAmount, 13.5);
  assert.deepEqual(result.overdueInstallmentIds, ['inst-1', 'inst-2']);
});

test('marca castigo y semaforo rojo al superar el umbral de dias sin pago', () => {
  const result = evaluateLoanDelinquency({
    now: NOW,
    config: buildConfig({ dailyRate: 1, punishmentThresholdDays: 45 }),
    installments: [
      installment({
        id: 'inst-1',
        dueDate: '2026-01-24T12:00:00.000Z',
        amount: 200,
      }),
    ],
  });

  assert.equal(result.overdueDays, 46);
  assert.equal(result.moraAmount, 92);
  assert.equal(result.trafficLight, 'RED');
  assert.equal(result.shouldPunish, true);
  assert.deepEqual(result.overdueInstallmentIds, ['inst-1']);
});
