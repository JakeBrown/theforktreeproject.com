export const ADELAIDE_TIME_ZONE = 'Australia/Adelaide';

export interface VolunteerSignInInput {
  fullName: string;
  email: string;
  phone: string;
  volunteerDate: string;
  communicationsConsent: boolean;
  website?: string;
}

export interface ValidatedVolunteerSignIn {
  fullName: string;
  email: string;
  emailNormalized: string;
  phone: string;
  phoneNormalized: string;
  volunteerDate: string;
  communicationsConsent: boolean;
}

export type VolunteerSignInValidationResult =
  | { success: true; data: ValidatedVolunteerSignIn }
  | { success: false; errors: Record<string, string> };

export function getAdelaideDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: ADELAIDE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');

  if (digits.startsWith('0061')) digits = digits.slice(2);
  if (digits.startsWith('610') && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.startsWith('61') && digits.length === 11) return `0${digits.slice(2)}`;

  return digits;
}

export function validateVolunteerSignIn(
  input: Partial<VolunteerSignInInput>,
  today = getAdelaideDate()
): VolunteerSignInValidationResult {
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim().replace(/\s+/g, ' ') : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim().replace(/\s+/g, ' ') : '';
  const volunteerDate = typeof input.volunteerDate === 'string' ? input.volunteerDate : '';
  const phoneNormalized = normalizePhone(phone);
  const errors: Record<string, string> = {};

  if (fullName.length < 2 || fullName.length > 120) {
    errors.fullName = 'Enter your full name.';
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (phoneNormalized.length < 8 || phoneNormalized.length > 15) {
    errors.phone = 'Enter a valid phone number.';
  }

  if (volunteerDate !== today) {
    errors.volunteerDate = 'Volunteer sign-in is only available for today.';
  }

  const communicationsConsent = input.communicationsConsent ?? false;
  if (typeof communicationsConsent !== 'boolean') {
    errors.communicationsConsent = 'Invalid communications preference.';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      fullName,
      email,
      emailNormalized: email.toLowerCase(),
      phone,
      phoneNormalized,
      volunteerDate,
      communicationsConsent: communicationsConsent as boolean,
    },
  };
}
