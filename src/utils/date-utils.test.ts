/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getKarachiDateKey,
  formatKarachiDateShort,
  formatKarachiDateTime,
  formatKarachiDateOnly,
  isOrderRecent,
} from './date-utils';

test('getKarachiDateKey handles UTC midnight transition properly', () => {
  // 2026-10-31T20:00:00Z is 2026-11-01 01:00:00 in Asia/Karachi (UTC+5)
  const utcDate = '2026-10-31T20:00:00Z';
  const karachiKey = getKarachiDateKey(utcDate);
  assert.equal(karachiKey, '2026-11-01');

  // 2026-10-31T18:59:59Z is 2026-10-31 23:59:59 in Asia/Karachi (UTC+5)
  const prevDate = '2026-10-31T18:59:59Z';
  assert.equal(getKarachiDateKey(prevDate), '2026-10-31');
});

test('formatKarachiDateShort formats Pakistan date', () => {
  const utcDate = '2026-10-31T20:30:00Z'; // Nov 1 in PKT
  const formatted = formatKarachiDateShort(utcDate);
  assert.match(formatted, /Nov/);
  assert.match(formatted, /1/);
});

test('formatKarachiDateTime includes PKT suffix and local time', () => {
  const utcDate = '2026-10-31T20:30:00Z';
  const formatted = formatKarachiDateTime(utcDate);
  assert.match(formatted, /PKT/);
});

test('isOrderRecent correctly detects orders created in last 10 minutes', () => {
  const now = Date.now();
  const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
  const twentyMinAgo = new Date(now - 20 * 60 * 1000).toISOString();

  assert.equal(isOrderRecent(fiveMinAgo, 10), true);
  assert.equal(isOrderRecent(twentyMinAgo, 10), false);
  assert.equal(isOrderRecent('', 10), false);
});
