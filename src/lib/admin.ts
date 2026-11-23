export const ADMIN_RESULT_LIMIT = 500;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface D1Result<T> {
  results?: T[];
}

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
}

export interface DetailItem {
  label: string;
  value: string | string[];
}

export interface DetailGroup {
  heading: string;
  items: DetailItem[];
}

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return 'Not provided';
  const text = String(value).trim();
  return text || 'Not provided';
}

export function formatDate(value: string): string {
  if (!isValidIsoDate(value)) return displayValue(value);
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return displayValue(value);
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Adelaide',
    timeZoneName: 'short',
  }).format(date);
}

export function formatTime(value: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return displayValue(value);
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Australia/Adelaide',
  }).format(date);
}

export function yesNo(value: number | boolean): string {
  return value === 1 || value === true ? 'Yes' : 'No';
}

export function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function parseJsonList(value: string, labels: ReadonlyMap<string, string>): string[] {
  if (!value.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      return ['Stored value could not be read'];
    }
    return parsed.map((item) => labels.get(item) || humanize(item));
  } catch {
    return ['Stored value could not be read'];
  }
}

export function parseQualifications(value: string): string[] {
  if (!value.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return ['Stored value could not be read'];
    }

    const qualification = parsed as Record<string, unknown>;
    const details: string[] = [];
    if (qualification.firstAid === true) {
      details.push(`First Aid${qualification.firstAidExpiry ? ` — expires ${formatDate(String(qualification.firstAidExpiry))}` : ''}`);
    }
    if (qualification.cpr === true) {
      details.push(`CPR${qualification.cprExpiry ? ` — expires ${formatDate(String(qualification.cprExpiry))}` : ''}`);
    }
    if (qualification.chemicalHandling === true) {
      details.push(`Chemical handling${qualification.chemicalHandlingExpiry ? ` — expires ${formatDate(String(qualification.chemicalHandlingExpiry))}` : ''}`);
    }
    if (qualification.chainsaw === true) details.push('Chainsaw qualification');
    if (qualification.other === true) {
      details.push(`Other${qualification.otherDetails ? ` — ${displayValue(qualification.otherDetails)}` : ''}`);
    }
    return details;
  } catch {
    return ['Stored value could not be read'];
  }
}
