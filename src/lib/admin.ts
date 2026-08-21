export const ADMIN_RESULT_LIMIT = 500;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface AdminFilters {
  name: string;
  date: string;
  active: boolean;
}

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

export function getAdminFilters(searchParams: URLSearchParams): AdminFilters {
  const name = (searchParams.get('name') || '').trim().replace(/\s+/g, ' ').slice(0, 100);
  const requestedDate = (searchParams.get('date') || '').trim();
  const date = isValidIsoDate(requestedDate) ? requestedDate : '';

  return { name, date, active: Boolean(name || date) };
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function zonedMidnightUtc(value: string, timeZone: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day);
  let timestamp = targetAsUtc;
  const formatter = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  // Convert a wall-clock midnight to UTC. Iterating also handles daylight-saving boundaries.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(timestamp))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)])
    );
    const displayedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    timestamp += targetAsUtc - displayedAsUtc;
  }

  return new Date(timestamp);
}

export function adelaideDateBounds(value: string): [string, string] {
  const [year, month, day] = value.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
  return [
    zonedMidnightUtc(value, 'Australia/Adelaide').toISOString(),
    zonedMidnightUtc(nextDate, 'Australia/Adelaide').toISOString(),
  ];
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
