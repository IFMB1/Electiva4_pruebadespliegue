import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { BUSINESS_CONSTANTS } from '../../config/constants';
import { logger } from '../../utils/logger';
import {
  deriveTrafficLight,
  evaluateLoanDelinquency,
  type DelinquencyConfig,
} from './delinquency.rules';

const OPEN_LOAN_STATUSES = ['ACTIVE', 'DEFAULTED'] as const;

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

async function getDelinquencyConfig(tx: Prisma.TransactionClient): Promise<DelinquencyConfig> {
  const activeConfig = await tx.moraConfig.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: {
      dailyRate: true,
      gracePeriodHours: true,
      punishmentThresholdDays: true,
    },
  });

  return {
    dailyRate: activeConfig ? toNumber(activeConfig.dailyRate) : 0,
    gracePeriodHours: activeConfig?.gracePeriodHours ?? BUSINESS_CONSTANTS.GRACE_PERIOD_HOURS,
    punishmentThresholdDays:
      activeConfig?.punishmentThresholdDays ?? BUSINESS_CONSTANTS.PUNISHMENT_THRESHOLD_DAYS,
  };
}

function resolveInstallmentStatus(params: {
  pendingAmount: number;
  paidAmount: number;
  isOverdue: boolean;
}): 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE' {
  if (params.pendingAmount <= 0) {
    return 'PAID';
  }

  if (params.isOverdue) {
    return 'OVERDUE';
  }

  if (params.paidAmount > 0) {
    return 'PARTIAL';
  }

  return 'PENDING';
}

async function syncInstallmentStatuses(
  tx: Prisma.TransactionClient,
  loanId: string,
  overdueInstallmentIds: string[]
) {
  const overdueSet = new Set(overdueInstallmentIds);
  const installments = await tx.installment.findMany({
    where: { loanId },
    select: {
      id: true,
      amount: true,
      paidAmount: true,
      status: true,
    },
  });

  for (const installment of installments) {
    const amount = toNumber(installment.amount);
    const paidAmount = toNumber(installment.paidAmount);
    const pendingAmount = roundMoney(amount - paidAmount);
    const nextStatus = resolveInstallmentStatus({
      pendingAmount,
      paidAmount,
      isOverdue: overdueSet.has(installment.id),
    });

    if (nextStatus === installment.status) {
      continue;
    }

    await tx.installment.update({
      where: { id: installment.id },
      data: {
        status: nextStatus,
        paidAt: nextStatus === 'PAID' ? new Date() : null,
      },
    });
  }
}

function resolveLoanStatus(params: {
  currentStatus: (typeof OPEN_LOAN_STATUSES)[number];
  shouldPunish: boolean;
}) {
  if (params.shouldPunish) {
    return 'DEFAULTED' as const;
  }

  if (params.currentStatus === 'DEFAULTED') {
    return 'ACTIVE' as const;
  }

  return params.currentStatus;
}

async function syncClientRisk(
  tx: Prisma.TransactionClient,
  clientId: string,
  punishmentThresholdDays: number
) {
  const openLoans = await tx.loan.findMany({
    where: {
      clientId,
      status: { in: [...OPEN_LOAN_STATUSES] },
    },
    select: {
      overdueDays: true,
    },
  });

  const maxOverdueDays = openLoans.reduce(
    (maxValue, loan) => Math.max(maxValue, loan.overdueDays),
    0
  );

  await tx.client.update({
    where: { id: clientId },
    data: {
      isPunished: maxOverdueDays >= punishmentThresholdDays,
      trafficLight: deriveTrafficLight(maxOverdueDays),
    },
  });
}

export async function refreshLoanDelinquency(loanId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
      select: {
        id: true,
        clientId: true,
        status: true,
        installments: {
          select: {
            id: true,
            dueDate: true,
            amount: true,
            paidAmount: true,
          },
        },
      },
    });

    if (!loan) {
      return null;
    }

    const config = await getDelinquencyConfig(tx);

    if (!OPEN_LOAN_STATUSES.includes(loan.status as (typeof OPEN_LOAN_STATUSES)[number])) {
      await tx.loan.update({
        where: { id: loan.id },
        data: {
          overdueDays: 0,
          moraAmount: 0,
        },
      });
      await syncClientRisk(tx, loan.clientId, config.punishmentThresholdDays);
      return {
        loanId: loan.id,
        overdueDays: 0,
        moraAmount: 0,
      };
    }

    const evaluation = evaluateLoanDelinquency({
      now,
      config,
      installments: loan.installments.map((installment) => ({
        id: installment.id,
        dueDate: installment.dueDate,
        amount: toNumber(installment.amount),
        paidAmount: toNumber(installment.paidAmount),
      })),
    });

    await syncInstallmentStatuses(tx, loan.id, evaluation.overdueInstallmentIds);

    const nextLoanStatus = resolveLoanStatus({
      currentStatus: loan.status as (typeof OPEN_LOAN_STATUSES)[number],
      shouldPunish: evaluation.shouldPunish,
    });

    await tx.loan.update({
      where: { id: loan.id },
      data: {
        overdueDays: evaluation.overdueDays,
        moraAmount: evaluation.moraAmount,
        status: nextLoanStatus,
      },
    });

    await syncClientRisk(tx, loan.clientId, config.punishmentThresholdDays);

    return {
      loanId: loan.id,
      overdueDays: evaluation.overdueDays,
      moraAmount: evaluation.moraAmount,
      status: nextLoanStatus,
      shouldPunish: evaluation.shouldPunish,
    };
  });
}

export async function refreshAllOpenLoansDelinquency(now = new Date()) {
  const openLoans = await prisma.loan.findMany({
    where: {
      status: { in: [...OPEN_LOAN_STATUSES] },
    },
    select: { id: true },
  });

  let processed = 0;
  let failed = 0;

  for (const loan of openLoans) {
    try {
      await refreshLoanDelinquency(loan.id, now);
      processed += 1;
    } catch (error) {
      failed += 1;
      logger.error('Failed to refresh loan delinquency', {
        loanId: loan.id,
        error,
      });
    }
  }

  return {
    processed,
    failed,
    total: openLoans.length,
  };
}
