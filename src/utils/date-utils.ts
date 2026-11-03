/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Timezone utilities for Pakistan Standard Time (PKT: UTC+5, 'Asia/Karachi')
 */

export const PK_TIMEZONE = 'Asia/Karachi';

/**
 * Returns date in YYYY-MM-DD format according to Asia/Karachi timezone
 */
export function getKarachiDateKey(dateInput: Date | string | number): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d); // Produces YYYY-MM-DD
}

/**
 * Formats a date into a short label in Pakistan time (e.g., "31 Oct" or "Sat, Oct 31")
 */
export function formatKarachiDateShort(dateInput: Date | string | number, withWeekday = false): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-PK', {
    timeZone: PK_TIMEZONE,
    weekday: withWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats date and time in Pakistan time, e.g. "31 Oct 2026, 09:30 PM PKT"
 */
export function formatKarachiDateTime(dateInput: Date | string | number): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  return d.toLocaleString('en-PK', {
    timeZone: PK_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }) + ' PKT';
}

/**
 * Formats date only in Pakistan time (e.g., "31 Oct 2026")
 */
export function formatKarachiDateOnly(dateInput: Date | string | number): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('en-PK', {
    timeZone: PK_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Checks whether an order was created within the last N minutes (defaults to 10 minutes)
 */
export function isOrderRecent(createdAt: string | number | Date, minutes = 10): boolean {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (isNaN(createdTime)) return false;

  const now = Date.now();
  const diffMs = now - createdTime;
  return diffMs >= 0 && diffMs <= minutes * 60 * 1000;
}
