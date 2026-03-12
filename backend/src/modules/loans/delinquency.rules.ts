import { BUSINESS_CONSTANTS } from '../../config/constants';

const MILLIS_PER_HOUR = 60 * 60 * 1000;
const MILLIS_PER_DAY = 24 * MILLIS_PER_HOUR;

export interface DelinquencyConfig {
  dailyRate: number;
  gracePeriodHours: number;
  punishmentThresholdDays: number;
}

export interface InstallmentSnapshot {
  id: string;
  dueDate: Date;
  amount: number;
  paidAmount: number;
}

export interface DelinquencyEvaluation {
  overdueDays: number;
  moraAmount: number;
  overdueInstallmentIds: string[];
  trafficLight: 'GREEN' | 'YELLOW' | 'RED';
  shouldPunish: boolean;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function toPendingAmount(installment: InstallmentSnapshot) {
  const pending = installment.amount - installment.paidAmount;
  return pending > 0 ? roundMoney(pending) : 0;
}

function calculateInstallmentOverdueDays(
  dueDate: Date,
  now: Date,
  gracePeriodHours: number
) {
  const overdueMillis =
    now.getTime() - dueDate.getTime() - gracePeriodHours * MILLIS_PER_HOUR;
  if (overdueMillis <= 0) return 0;
  return Math.floor(overdueMillis / MILLIS_PER_DAY);
}

export function deriveTrafficLight(overdueDays: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (overdueDays <= BUSINESS_CONSTANTS.TRAFFIC_LIGHT.GREEN_MAX_DAYS) {
    return 'GREEN';
  }

  if (overdueDays <= BUSINESS_CONSTANTS.TRAFFIC_LIGHT.YELLOW_MAX_DAYS) {
    return 'YELLOW';
  }

  return 'RED';
}

export function evaluateLoanDelinquency(params: {
  installments: InstallmentSnapshot[];
  config: DelinquencyConfig;
  now?: Date;
}): DelinquencyEvaluation {
  const now = params.now ?? new Date();
  const overdueInstallmentIds: string[] = [];
  let maxOverdueDays = 0;
  let overduePendingAmount = 0;

  for (const installment of params.installments) {
    const pendingAmount = toPendingAmount(installment);
    if (pendingAmount <= 0) {
      continue;
    }

    const installmentOverdueDays = calculateInstallmentOverdueDays(
      installment.dueDate,
      now,
      params.config.gracePeriodHours
    );

    if (installmentOverdueDays <= 0) {
      continue;
    }

    overdueInstallmentIds.push(installment.id);
    overduePendingAmount = roundMoney(overduePendingAmount + pendingAmount);
    maxOverdueDays = Math.max(maxOverdueDays, installmentOverdueDays);
  }

  const moraAmount = roundMoney(
    overduePendingAmount * (params.config.dailyRate / 100) * maxOverdueDays
  );
  const trafficLight = deriveTrafficLight(maxOverdueDays);
  const shouldPunish = maxOverdueDays >= params.config.punishmentThresholdDays;

  return {
    overdueDays: maxOverdueDays,
    moraAmount,
    overdueInstallmentIds,
    trafficLight,
    shouldPunish,
  };
}
