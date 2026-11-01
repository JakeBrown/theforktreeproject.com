import { isValidIsoDate, isValidTime } from './volunteerAttendance.ts';
import { normalizePhone } from './volunteerSignIn.ts';

export interface ProfileFieldDefinition {
  name: string;
  label: string;
  maxLength: number;
  multiline?: boolean;
  type?: 'text' | 'tel' | 'email';
  autocomplete?: string;
}

export const PROFILE_DETAIL_FIELDS: ProfileFieldDefinition[] = [
  { name: 'full_name', label: 'Full name', maxLength: 120, autocomplete: 'off' },
  { name: 'preferred_name', label: 'Preferred name', maxLength: 80, autocomplete: 'off' },
  { name: 'phone', label: 'Phone', maxLength: 30, type: 'tel', autocomplete: 'off' },
  { name: 'email', label: 'Email', maxLength: 200, type: 'email', autocomplete: 'off' },
  { name: 'address', label: 'Address', maxLength: 300, multiline: true },
];

export const PROFILE_EMERGENCY_FIELDS: ProfileFieldDefinition[] = [
  { name: 'emergency_contact_name', label: 'Emergency contact name', maxLength: 120 },
  { name: 'emergency_contact_relationship', label: 'Relationship', maxLength: 80 },
  { name: 'emergency_contact_phone', label: 'Emergency contact phone', maxLength: 30, type: 'tel' },
  { name: 'secondary_emergency_contact_name', label: 'Second emergency contact name', maxLength: 120 },
  { name: 'secondary_emergency_contact_relationship', label: 'Relationship', maxLength: 80 },
  { name: 'secondary_emergency_contact_phone', label: 'Second emergency contact phone', maxLength: 30, type: 'tel' },
];

export const PROFILE_NOTE_FIELDS: ProfileFieldDefinition[] = [
  { name: 'support_needs', label: 'Support needs, medical or accessibility information', maxLength: 2000, multiline: true },
  { name: 'notes', label: 'Admin notes', maxLength: 5000, multiline: true },
];

export const PROFILE_FIELDS = [...PROFILE_DETAIL_FIELDS, ...PROFILE_EMERGENCY_FIELDS, ...PROFILE_NOTE_FIELDS];

export type ProfileValues = Record<string, string> & { phone_normalized: string };

function cleanValue(value: FormDataEntryValue | null, field: ProfileFieldDefinition): string {
  if (typeof value !== 'string') return '';
  const text = field.multiline
    ? value.replace(/\r\n?/g, '\n').trim()
    : value.trim().replace(/\s+/g, ' ');
  return text.slice(0, field.maxLength);
}

export function parseProfileForm(
  form: FormData
): { success: true; values: ProfileValues } | { success: false; errors: Record<string, string>; values: Record<string, string> } {
  const values: Record<string, string> = {};
  for (const field of PROFILE_FIELDS) values[field.name] = cleanValue(form.get(field.name), field);

  const errors: Record<string, string> = {};
  if (values.full_name.length < 2) errors.full_name = 'Enter the volunteer’s full name.';
  const phoneNormalized = values.phone ? normalizePhone(values.phone) : '';
  if (values.phone && (phoneNormalized.length < 8 || phoneNormalized.length > 15)) {
    errors.phone = 'Enter a valid phone number, or leave it blank.';
  }
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';

  if (Object.keys(errors).length > 0) return { success: false, errors, values };
  return { success: true, values: { ...values, phone_normalized: phoneNormalized } };
}

export interface VisitValues {
  visit_date: string;
  start_time: string;
  end_time: string;
  notes: string;
}

export function parseVisitForm(
  form: FormData,
  today: string
): { success: true; values: VisitValues } | { success: false; error: string } {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };
  const values: VisitValues = {
    visit_date: text('visit_date'),
    start_time: text('start_time'),
    end_time: text('end_time'),
    notes: text('visit_notes').replace(/\s+/g, ' ').slice(0, 300),
  };

  if (!isValidIsoDate(values.visit_date)) return { success: false, error: 'Choose a date for the visit.' };
  if (values.visit_date < today) return { success: false, error: 'Scheduled visits must be today or later.' };
  if (values.start_time && !isValidTime(values.start_time)) return { success: false, error: 'Enter a valid start time.' };
  if (values.end_time && !isValidTime(values.end_time)) return { success: false, error: 'Enter a valid finish time.' };
  if (values.start_time && values.end_time && values.end_time <= values.start_time) {
    return { success: false, error: 'The finish time must be after the start time.' };
  }
  return { success: true, values };
}

export const MAX_PHOTO_BYTES = 1_500_000;

/** Identify an uploaded image by its leading bytes rather than trusting the browser's MIME type. */
export function detectImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'image/png';
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) return 'image/webp';
  return null;
}

export function parsePositiveId(value: unknown): number | null {
  const text = String(value ?? '');
  if (!/^\d{1,10}$/.test(text)) return null;
  const id = Number(text);
  return id > 0 ? id : null;
}
