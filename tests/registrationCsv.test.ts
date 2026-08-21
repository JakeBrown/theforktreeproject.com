import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRegistrationCsv,
  preventCsvFormula,
  type RegistrationExportLabels,
  type RegistrationExportRow,
} from '../src/lib/registrationCsv.ts';

const labels: RegistrationExportLabels = {
  interests: new Map([
    ['planting', 'Tree planting'],
    ['other', 'Other'],
  ]),
  frequencies: new Map([['monthly', 'Monthly']]),
  weekdays: new Map([['monday', 'Monday']]),
};

const registration: RegistrationExportRow = {
  id: 1,
  email: '+volunteer@example.com',
  full_name: '-Anne Smith',
  preferred_name: '-Anne',
  phone: '+61 412 345 678',
  is_under_18: 0,
  interests_json: '["planting"]',
  interest_other: '',
  frequency: 'monthly',
  preferred_days_json: '["monday"]',
  registered_at: '2026-08-21T01:00:00.000Z',
};

test('formula protection preserves recognised MailerLite contact values', () => {
  assert.equal(preventCsvFormula('+61 412 345 678', 'phone'), '+61 412 345 678');
  assert.equal(preventCsvFormula('+volunteer@example.com', 'email'), '+volunteer@example.com');
  assert.equal(preventCsvFormula('-Anne Smith', 'human-name'), '-Anne Smith');

  const csv = buildRegistrationCsv([registration], labels);
  assert.match(csv, /"\+volunteer@example\.com","-Anne Smith","-Anne","\+61 412 345 678"/);
});

test('formula protection neutralises suspicious payloads', () => {
  for (const payload of ['=HYPERLINK("https://example.com")', '+SUM(1,2)', '-1+2', '@SUM(A1:A2)', '\t=1+1']) {
    assert.equal(preventCsvFormula(payload), `'${payload}`);
  }
  assert.equal(preventCsvFormula('+1-2', 'phone'), "'+1-2");
  assert.equal(preventCsvFormula('+SUM(1)@example.com', 'email'), "'+SUM(1)@example.com");
  assert.equal(preventCsvFormula('-1+2', 'human-name'), "'-1+2");
});

test('selection JSON preserves valid empty arrays', () => {
  const csv = buildRegistrationCsv([
    { ...registration, interests_json: '[]', preferred_days_json: '[]' },
  ], labels);
  assert.match(csv, /,"",(?="2026-08-21")/);
});

test('selection JSON rejects blank, malformed, non-array, and mixed arrays', () => {
  const invalidValues = ['', '   ', '{', '{}', '["planting", 7]'];

  for (const invalid of invalidValues) {
    assert.throws(
      () => buildRegistrationCsv([{ ...registration, interests_json: invalid }], labels),
      { name: invalid === '{' ? 'SyntaxError' : 'TypeError' }
    );
    assert.throws(
      () => buildRegistrationCsv([{ ...registration, preferred_days_json: invalid }], labels),
      { name: invalid === '{' ? 'SyntaxError' : 'TypeError' }
    );
  }
});
