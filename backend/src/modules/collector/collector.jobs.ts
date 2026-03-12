import {
  autoCloseTodayOpenShifts,
  autoCloseExpiredShifts,
  processCollectorInactivityAlerts,
} from './collector.service';
import { refreshAllOpenLoansDelinquency } from '../loans/delinquency.service';
import { BUSINESS_TIMEZONE } from './collector.shared';
import { logger } from '../../utils/logger';

let jobTimer: NodeJS.Timeout | null = null;
let lastInactivitySlotKey: string | null = null;
let lastAutoCloseDateKey: string | null = null;
let lastStaleRecoveryDateKey: string | null = null;
let lastDelinquencySlotKey: string | null = null;

function getBusinessTimeParts(reference = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(reference);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';

  const year = pick('year');
  const month = pick('month');
  const day = pick('day');
  const rawHour = Number(pick('hour'));
  const hour = Number.isFinite(rawHour) ? rawHour % 24 : 0;
  const minute = Number(pick('minute'));

  return {
    dateKey: `${year}-${month}-${day}`,
    hour,
    minute,
  };
}

async function runCollectorJobsTick() {
  const businessTime = getBusinessTimeParts();

  // Recovery check after midnight for any stale open shifts (e.g. server downtime).
  if (
    businessTime.hour === 0 &&
    businessTime.minute >= 10 &&
    lastStaleRecoveryDateKey !== businessTime.dateKey
  ) {
    await autoCloseExpiredShifts();
    lastStaleRecoveryDateKey = businessTime.dateKey;
  }

  // Inactivity checks every 30 minutes between 08:00 and 23:59.
  const shouldCheckInactivity =
    businessTime.hour >= 8 &&
    businessTime.hour <= 23 &&
    (businessTime.minute === 0 || businessTime.minute === 30);

  if (shouldCheckInactivity) {
    const slotKey = `${businessTime.dateKey}T${String(businessTime.hour).padStart(2, '0')}:${String(
      businessTime.minute
    ).padStart(2, '0')}`;
    if (slotKey !== lastInactivitySlotKey) {
      await processCollectorInactivityAlerts();
      lastInactivitySlotKey = slotKey;
    }
  }

  // Delinquency refresh every hour at minute 10.
  const shouldRefreshDelinquency = businessTime.minute === 10;
  if (shouldRefreshDelinquency) {
    const slotKey = `${businessTime.dateKey}T${String(businessTime.hour).padStart(2, '0')}:10`;
    if (slotKey !== lastDelinquencySlotKey) {
      const refreshResult = await refreshAllOpenLoansDelinquency();
      if (refreshResult.processed > 0 || refreshResult.failed > 0) {
        logger.info('Delinquency refresh tick executed', refreshResult);
      }
      lastDelinquencySlotKey = slotKey;
    }
  }

  // Automatic close exactly at 23:59.
  const shouldAutoCloseNow = businessTime.hour === 23 && businessTime.minute === 59;
  if (shouldAutoCloseNow && lastAutoCloseDateKey !== businessTime.dateKey) {
    await autoCloseTodayOpenShifts(businessTime.dateKey);
    lastAutoCloseDateKey = businessTime.dateKey;
  }
}

export function startCollectorJobs() {
  if (jobTimer) return;

  autoCloseExpiredShifts().catch((error) => {
    logger.error('Collector jobs startup recovery failed', { error });
  });

  refreshAllOpenLoansDelinquency().catch((error) => {
    logger.error('Delinquency startup refresh failed', { error });
  });

  runCollectorJobsTick().catch((error) => {
    logger.error('Collector jobs initial tick failed', { error });
  });

  jobTimer = setInterval(() => {
    runCollectorJobsTick().catch((error) => {
      logger.error('Collector jobs tick failed', { error });
    });
  }, 60 * 1000);
}

export function stopCollectorJobs() {
  if (jobTimer) {
    clearInterval(jobTimer);
    jobTimer = null;
  }
}
