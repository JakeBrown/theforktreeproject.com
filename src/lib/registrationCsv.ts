export const REGISTRATION_CSV_HEADERS = [
  'Email',
  'Full Name',
  'Preferred Name',
  'Phone',
  'Under 18',
  'Interests',
  'Frequency',
  'Preferred Days',
  'Registration Date',
] as const;

export interface RegistrationExportRow {
  id: number;
  email: string;
  full_name: string;
  preferred_name: string;
  phone: string;
  is_under_18: number;
  interests_json: string;
  interest_other: string;
  frequency: string;
  preferred_days_json: string;
  registered_at: string;
}

export interface RegistrationExportLabels {
  interests: ReadonlyMap<string, string>;
  frequencies: ReadonlyMap<string, string>;
  weekdays: ReadonlyMap<string, string>;
}

function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function decodedLabels(value: string, labels: ReadonlyMap<string, string>): string[] {
  if (!value.trim()) throw new TypeError('Registration selection JSON must not be blank');

  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
    throw new TypeError('Registration selection JSON must be an array of strings');
  }

  return parsed.map((item) => labels.get(item) || humanize(item));
}

function interestsCell(row: RegistrationExportRow, labels: ReadonlyMap<string, string>): string {
  const interests = decodedLabels(row.interests_json, labels);
  const otherLabel = labels.get('other') || 'Other';
  const otherIndex = interests.indexOf(otherLabel);
  const other = row.interest_other.trim();

  if (other && otherIndex >= 0) interests[otherIndex] = `${otherLabel}: ${other}`;
  return interests.join('; ');
}

function registrationDate(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Adelaide',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}-${values.month}-${values.day}`;
}

export type RegistrationCsvField = 'text' | 'email' | 'phone' | 'human-name';

const INTERNATIONAL_PHONE = /^\+(?=(?:\D*\d){7,15}\D*$)\d[\d ()-]*$/;
const PLUS_EMAIL = /^\+[A-Z0-9.!#$%&'*+/=?^_`{|}~-]*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
const HYPHENATED_NAME = /^- ?\p{L}[\p{L}\p{M}'’ -]*$/u;

function isRecognisedSafeValue(text: string, field: RegistrationCsvField): boolean {
  if (field === 'phone') return INTERNATIONAL_PHONE.test(text);
  if (field === 'email') return PLUS_EMAIL.test(text);
  if (field === 'human-name') return HYPHENATED_NAME.test(text);
  return false;
}

/** Neutralise formula-like values, except recognised legitimate values for typed fields. */
export function preventCsvFormula(value: unknown, field: RegistrationCsvField = 'text'): string {
  const text = value === null || value === undefined ? '' : String(value);
  const formulaLike = /^[\t\r\n]/.test(text) || /^\s*[=+\-@]/.test(text);
  return formulaLike && !isRecognisedSafeValue(text, field) ? `'${text}` : text;
}

/** Escape one field according to RFC 4180. Quoting every field keeps output predictable. */
export function escapeCsvField(value: unknown, field: RegistrationCsvField = 'text'): string {
  return `"${preventCsvFormula(value, field).replace(/"/g, '""')}"`;
}

export function serializeCsv(
  rows: readonly (readonly unknown[])[],
  fields: readonly RegistrationCsvField[] = []
): string {
  return rows
    .map((row) => row.map((value, index) => escapeCsvField(value, fields[index])).join(','))
    .join('\r\n');
}

export function buildRegistrationCsv(
  registrations: readonly RegistrationExportRow[],
  labels: RegistrationExportLabels
): string {
  const rows = registrations.map((registration) => [
    registration.email,
    registration.full_name,
    registration.preferred_name,
    registration.phone,
    registration.is_under_18 === 1 ? 'Yes' : 'No',
    interestsCell(registration, labels.interests),
    labels.frequencies.get(registration.frequency) || humanize(registration.frequency),
    decodedLabels(registration.preferred_days_json, labels.weekdays).join('; '),
    registrationDate(registration.registered_at),
  ]);

  const fields: readonly RegistrationCsvField[] = [
    'email',
    'human-name',
    'human-name',
    'phone',
    'text',
    'text',
    'text',
    'text',
    'text',
  ];

  return `\uFEFF${serializeCsv([REGISTRATION_CSV_HEADERS, ...rows], fields)}\r\n`;
}
