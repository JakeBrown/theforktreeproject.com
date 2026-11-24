import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateVolunteerSignIn } from '../src/lib/volunteerSignIn.ts';

const base = { fullName: 'Sam Example', phone: '0400 000 000', volunteerDate: '2026-11-24', declarationAccepted: true };

test('sign-in without an arrival time means now', () => {
  const result = validateVolunteerSignIn(base, '2026-11-24', '10:00');
  assert.equal(result.success && result.data.arrivalTime, '');
});

test('an earlier arrival time is accepted', () => {
  const result = validateVolunteerSignIn({ ...base, arrivalTime: '08:30' }, '2026-11-24', '10:00');
  assert.equal(result.success && result.data.arrivalTime, '08:30');
});

test('arrival time cannot be later than now or malformed', () => {
  const later = validateVolunteerSignIn({ ...base, arrivalTime: '10:01' }, '2026-11-24', '10:00');
  assert.equal(later.success, false);
  assert.ok(!later.success && later.errors.arrivalTime);
  const bad = validateVolunteerSignIn({ ...base, arrivalTime: '25:00' }, '2026-11-24', '10:00');
  assert.ok(!bad.success && bad.errors.arrivalTime);
});
