export const ADELAIDE_TIME_ZONE = 'Australia/Adelaide';

export interface VolunteerSignInInput {
  fullName: string;
  phone: string;
  volunteerDate: string;
  declarationAccepted?: boolean;
  /** "HH:MM" Adelaide time for someone who arrived earlier and forgot to sign in. Empty means now. */
  arrivalTime?: string;
  website?: string;
}

export interface ValidatedVolunteerSignIn {
  fullName: string;
  phone: string;
  phoneNormalized: string;
  volunteerDate: string;
  arrivalTime: string;
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

/** Current "HH:MM" in Adelaide. */
export function getAdelaideTime(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: ADELAIDE_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.hour}:${values.minute}`;
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
  today = getAdelaideDate(),
  nowTime = getAdelaideTime()
): VolunteerSignInValidationResult {
  const fullName = typeof input.fullName === 'string' ? input.fullName.trim().replace(/\s+/g, ' ') : '';
  const phone = typeof input.phone === 'string' ? input.phone.trim().replace(/\s+/g, ' ') : '';
  const volunteerDate = typeof input.volunteerDate === 'string' ? input.volunteerDate : '';
  const phoneNormalized = normalizePhone(phone);
  const arrivalTime = typeof input.arrivalTime === 'string' ? input.arrivalTime.trim() : '';
  const errors: Record<string, string> = {};

  if (fullName.length < 2 || fullName.length > 120) {
    errors.fullName = 'Enter your full name.';
  }

  if (phoneNormalized.length < 8 || phoneNormalized.length > 15) {
    errors.phone = 'Enter a valid phone number.';
  }

  if (input.declarationAccepted !== true) {
    errors.declarationAccepted = 'Please read and agree to the declaration before signing in.';
  }

  if (arrivalTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(arrivalTime)) {
    errors.arrivalTime = 'Choose the time you arrived.';
  } else if (arrivalTime && arrivalTime > nowTime) {
    errors.arrivalTime = 'Your arrival time can’t be later than now.';
  }

  if (volunteerDate !== today) {
    errors.volunteerDate = 'Volunteer sign-in is only available for today.';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      fullName,
      phone,
      phoneNormalized,
      volunteerDate,
      arrivalTime,
    },
  };
}

export interface VolunteerSignOutInput {
  phone: string;
  website?: string;
}

export function validateVolunteerSignOut(
  input: Partial<VolunteerSignOutInput>
): { success: true; phone: string; phoneNormalized: string } | { success: false; errors: Record<string, string> } {
  const phone = typeof input.phone === 'string' ? input.phone.trim().replace(/\s+/g, ' ') : '';
  const phoneNormalized = normalizePhone(phone);
  if (phoneNormalized.length < 8 || phoneNormalized.length > 15) {
    return { success: false, errors: { phone: 'Enter the phone number you signed in with.' } };
  }
  return { success: true, phone, phoneNormalized };
}
