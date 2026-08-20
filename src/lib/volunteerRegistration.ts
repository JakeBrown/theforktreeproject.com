import { getAdelaideDate, normalizePhone } from './volunteerSignIn';

export const VOLUNTEER_REGISTRATION_FORM_VERSION = '2026-08-14';

export const REFERRAL_SOURCES = [
  { value: 'friend-family', label: 'Friend or family' },
  { value: 'social-media', label: 'Social media (Facebook, Instagram or LinkedIn)' },
  { value: 'forktree-website', label: 'The Forktree Project website' },
  { value: 'community-event', label: 'Community event' },
  { value: 'council-community-group', label: 'Local council or community group' },
  { value: 'school-university-workplace', label: 'School, university or workplace' },
  { value: 'volunteer-referral-website', label: 'Volunteer referral website' },
  { value: 'other', label: 'Other' },
] as const;

export const VOLUNTEER_INTERESTS = [
  { value: 'tree-planting', label: 'Tree planting' },
  { value: 'nursery-work', label: 'Nursery work' },
  { value: 'watering-plant-maintenance', label: 'Watering and plant maintenance' },
  { value: 'weed-management-habitat-restoration', label: 'Weed management and habitat restoration' },
  { value: 'property-maintenance', label: 'Property maintenance' },
  { value: 'photography-videography', label: 'Photography and videography' },
  { value: 'education-community-engagement', label: 'Education and community engagement' },
  { value: 'trades-construction', label: 'Trades or construction' },
  { value: 'other', label: 'Other' },
] as const;

export const LICENCES = [
  { value: 'drivers-licence', label: "Driver's Licence" },
  { value: 'lr', label: 'LR' },
  { value: 'mr', label: 'MR' },
  { value: 'hr', label: 'HR' },
  { value: 'forklift', label: 'Forklift' },
  { value: 'tractor', label: 'Tractor' },
  { value: 'excavator', label: 'Excavator' },
  { value: 'other', label: 'Other' },
] as const;

export const VOLUNTEERING_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'occasionally', label: 'Occasionally' },
  { value: 'community-planting-days', label: 'Community planting days only' },
] as const;

export const WEEKDAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
] as const;

export type ReferralSource = (typeof REFERRAL_SOURCES)[number]['value'];
export type VolunteerInterest = (typeof VOLUNTEER_INTERESTS)[number]['value'];
export type Licence = (typeof LICENCES)[number]['value'];
export type VolunteeringFrequency = (typeof VOLUNTEERING_FREQUENCIES)[number]['value'];
export type Weekday = (typeof WEEKDAYS)[number]['value'];
export type WwccStatus = '' | 'yes' | 'no' | 'applied';
export type MediaConsent = '' | 'consent' | 'decline';

export interface VolunteerQualificationsInput {
  firstAid: boolean;
  firstAidExpiry: string;
  cpr: boolean;
  cprExpiry: string;
  chemicalHandling: boolean;
  chemicalHandlingExpiry: string;
  chainsaw: boolean;
  other: boolean;
  otherDetails: string;
}

export interface VolunteerRegistrationInput {
  fullName: string;
  preferredName: string;
  isUnder18: boolean | null;
  dateOfBirth: string;
  address: string;
  phone: string;
  email: string;
  referralSources: ReferralSource[];
  referralOther: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  interests: VolunteerInterest[];
  interestOther: string;
  skillsExperience: string;
  qualifications: VolunteerQualificationsInput;
  licences: Licence[];
  licenceOther: string;
  wwccStatus: WwccStatus;
  wwccNumber: string;
  wwccExpiryDate: string;
  frequency: VolunteeringFrequency | '';
  preferredDays: Weekday[];
  accessibilitySupport: string;
  medicalInformation: string;
  mediaConsent: MediaConsent;
  declarationName: string;
  agreementAccepted: boolean;
  website?: string;
}

export interface ValidatedVolunteerRegistration {
  fullName: string;
  preferredName: string;
  isUnder18: boolean;
  dateOfBirth: string;
  address: string;
  phone: string;
  phoneNormalized: string;
  email: string;
  emailNormalized: string;
  referralSources: ReferralSource[];
  referralOther: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactPhoneNormalized: string;
  interests: VolunteerInterest[];
  interestOther: string;
  skillsExperience: string;
  qualifications: VolunteerQualificationsInput;
  licences: Licence[];
  licenceOther: string;
  wwccStatus: WwccStatus;
  wwccNumber: string;
  wwccExpiryDate: string;
  frequency: VolunteeringFrequency;
  preferredDays: Weekday[];
  accessibilitySupport: string;
  medicalInformation: string;
  mediaConsent: Exclude<MediaConsent, ''>;
  declarationName: string;
  agreementAccepted: true;
}

export type VolunteerRegistrationValidationResult =
  | { success: true; data: ValidatedVolunteerRegistration }
  | { success: false; errors: Record<string, string> };

const REFERRAL_VALUES = new Set<string>(REFERRAL_SOURCES.map(({ value }) => value));
const INTEREST_VALUES = new Set<string>(VOLUNTEER_INTERESTS.map(({ value }) => value));
const LICENCE_VALUES = new Set<string>(LICENCES.map(({ value }) => value));
const FREQUENCY_VALUES = new Set<string>(VOLUNTEERING_FREQUENCIES.map(({ value }) => value));
const WEEKDAY_VALUES = new Set<string>(WEEKDAYS.map(({ value }) => value));
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function singleLine(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function multiline(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/\r\n?/g, '\n').trim().replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    : '';
}

function validIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function ageOnDate(dateOfBirth: string, today: string): number {
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split('-').map(Number);
  const [currentYear, currentMonth, currentDay] = today.split('-').map(Number);
  let age = currentYear - birthYear;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) age -= 1;
  return age;
}

function validateDate(
  value: string,
  field: string,
  errors: Record<string, string>,
  {
    required = false,
    notFuture = false,
    notPast = false,
  }: { required?: boolean; notFuture?: boolean; notPast?: boolean } = {},
  today = getAdelaideDate()
): string {
  if (!value) {
    if (required) errors[field] = 'Enter a date.';
    return '';
  }
  if (
    !validIsoDate(value) ||
    (notFuture && value > today) ||
    (notPast && value < today)
  ) {
    errors[field] = 'Enter a valid date.';
    return value;
  }
  return value;
}

function validateSelection<T extends string>(
  value: unknown,
  allowed: Set<string>,
  field: string,
  errors: Record<string, string>,
  requiredMessage?: string
): T[] {
  if (value === undefined && !requiredMessage) return [];
  if (!Array.isArray(value)) {
    errors[field] = requiredMessage || 'Choose valid options.';
    return [];
  }

  const duplicateCount = value.length - new Set(value).size;
  if (
    value.length > allowed.size ||
    duplicateCount > 0 ||
    value.some((item) => typeof item !== 'string' || !allowed.has(item))
  ) {
    errors[field] = 'Choose valid options.';
    return [];
  }

  if (requiredMessage && value.length === 0) errors[field] = requiredMessage;
  return value as T[];
}

function readBoolean(
  source: Record<string, unknown>,
  key: string,
  errorKey: string,
  errors: Record<string, string>
): boolean {
  const value = source[key];
  if (value === undefined) return false;
  if (typeof value !== 'boolean') {
    errors[errorKey] = 'Choose a valid option.';
    return false;
  }
  return value;
}

export function validateVolunteerRegistration(
  input: Partial<VolunteerRegistrationInput> | Record<string, unknown>,
  today = getAdelaideDate()
): VolunteerRegistrationValidationResult {
  const source = isRecord(input) ? input : {};
  const errors: Record<string, string> = {};

  const fullName = singleLine(source.fullName);
  const preferredName = singleLine(source.preferredName);
  const address = multiline(source.address);
  const phone = singleLine(source.phone);
  const phoneNormalized = normalizePhone(phone);
  const email = singleLine(source.email);
  const emailNormalized = email.toLowerCase();
  const referralOther = singleLine(source.referralOther);
  const emergencyContactName = singleLine(source.emergencyContactName);
  const emergencyContactRelationship = singleLine(source.emergencyContactRelationship);
  const emergencyContactPhone = singleLine(source.emergencyContactPhone);
  const emergencyContactPhoneNormalized = normalizePhone(emergencyContactPhone);
  const interestOther = singleLine(source.interestOther);
  const skillsExperience = multiline(source.skillsExperience);
  const licenceOther = singleLine(source.licenceOther);
  const wwccNumber = singleLine(source.wwccNumber);
  const accessibilitySupport = multiline(source.accessibilitySupport);
  const medicalInformation = multiline(source.medicalInformation);
  const declarationName = singleLine(source.declarationName);

  if (fullName.length < 2 || fullName.length > 120) errors.fullName = 'Enter your full name.';
  if (preferredName.length > 120) errors.preferredName = 'Preferred name must be 120 characters or fewer.';
  if (address.length < 5 || address.length > 500) errors.address = 'Enter your address.';
  if (phoneNormalized.length < 8 || phoneNormalized.length > 15) errors.phone = 'Enter a valid phone number.';
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = 'Enter a valid email address.';
  }
  if (emergencyContactName.length < 2 || emergencyContactName.length > 120) {
    errors.emergencyContactName = 'Enter your emergency contact’s name.';
  }
  if (emergencyContactRelationship.length < 2 || emergencyContactRelationship.length > 100) {
    errors.emergencyContactRelationship = 'Enter their relationship to you.';
  }
  if (emergencyContactPhoneNormalized.length < 8 || emergencyContactPhoneNormalized.length > 15) {
    errors.emergencyContactPhone = 'Enter a valid emergency contact phone number.';
  }
  if (skillsExperience.length > 4000) errors.skillsExperience = 'Use 4,000 characters or fewer.';
  if (accessibilitySupport.length > 4000) errors.accessibilitySupport = 'Use 4,000 characters or fewer.';
  if (medicalInformation.length > 4000) errors.medicalInformation = 'Use 4,000 characters or fewer.';
  if (declarationName.length < 2 || declarationName.length > 120) {
    errors.declarationName = 'Type your full name to sign the declaration.';
  }

  const isUnder18 = source.isUnder18;
  let dateOfBirth = singleLine(source.dateOfBirth);
  if (typeof isUnder18 !== 'boolean') {
    errors.isUnder18 = 'Tell us whether you are under 18.';
  } else if (isUnder18) {
    dateOfBirth = validateDate(dateOfBirth, 'dateOfBirth', errors, { required: true, notFuture: true }, today);
    if (validIsoDate(dateOfBirth) && dateOfBirth <= today && ageOnDate(dateOfBirth, today) >= 18) {
      errors.dateOfBirth = 'This date of birth does not indicate an age under 18.';
    }
  } else if (dateOfBirth) {
    if (!validIsoDate(dateOfBirth) || dateOfBirth > today) {
      errors.dateOfBirth = 'Enter a valid date of birth.';
    } else if (ageOnDate(dateOfBirth, today) < 18) {
      errors.isUnder18 = 'Select yes if you are under 18.';
    }
    dateOfBirth = '';
  }

  const referralSources = validateSelection<ReferralSource>(
    source.referralSources,
    REFERRAL_VALUES,
    'referralSources',
    errors,
    'Choose at least one option.'
  );
  if (referralSources.includes('other')) {
    if (referralOther.length < 2 || referralOther.length > 200) errors.referralOther = 'Tell us how you heard about us.';
  } else if (referralOther.length > 0) {
    errors.referralOther = 'Select Other before adding another referral source.';
  }

  const interests = validateSelection<VolunteerInterest>(
    source.interests,
    INTEREST_VALUES,
    'interests',
    errors,
    'Choose at least one activity.'
  );
  if (interests.includes('other')) {
    if (interestOther.length < 2 || interestOther.length > 200) errors.interestOther = 'Tell us what other activity interests you.';
  } else if (interestOther.length > 0) {
    errors.interestOther = 'Select Other before adding another activity.';
  }

  const qualificationsSource = source.qualifications;
  const qualificationsRecord = isRecord(qualificationsSource) ? qualificationsSource : {};
  if (qualificationsSource !== undefined && !isRecord(qualificationsSource)) {
    errors.qualifications = 'Choose valid qualification options.';
  }
  const firstAid = readBoolean(qualificationsRecord, 'firstAid', 'qualifications', errors);
  const cpr = readBoolean(qualificationsRecord, 'cpr', 'qualifications', errors);
  const chemicalHandling = readBoolean(qualificationsRecord, 'chemicalHandling', 'qualifications', errors);
  const chainsaw = readBoolean(qualificationsRecord, 'chainsaw', 'qualifications', errors);
  const qualificationOther = readBoolean(qualificationsRecord, 'other', 'qualifications', errors);
  const firstAidExpiry = validateDate(
    firstAid ? singleLine(qualificationsRecord.firstAidExpiry) : '',
    'qualificationFirstAidExpiry',
    errors,
    { required: firstAid, notPast: true },
    today
  );
  const cprExpiry = validateDate(
    cpr ? singleLine(qualificationsRecord.cprExpiry) : '',
    'qualificationCprExpiry',
    errors,
    { required: cpr, notPast: true },
    today
  );
  const chemicalHandlingExpiry = validateDate(
    chemicalHandling ? singleLine(qualificationsRecord.chemicalHandlingExpiry) : '',
    'qualificationChemicalHandlingExpiry',
    errors,
    { required: chemicalHandling, notPast: true },
    today
  );
  const qualificationOtherDetails = qualificationOther ? singleLine(qualificationsRecord.otherDetails) : '';
  if (qualificationOther && (qualificationOtherDetails.length < 2 || qualificationOtherDetails.length > 200)) {
    errors.qualificationOtherDetails = 'Tell us about your other qualification.';
  }

  const licences = validateSelection<Licence>(source.licences, LICENCE_VALUES, 'licences', errors);
  if (licences.includes('other')) {
    if (licenceOther.length < 2 || licenceOther.length > 200) errors.licenceOther = 'Tell us about your other licence.';
  } else if (licenceOther.length > 0) {
    errors.licenceOther = 'Select Other before adding another licence.';
  }

  const wwccStatus = typeof source.wwccStatus === 'string' ? source.wwccStatus : '';
  let wwccExpiryDate = singleLine(source.wwccExpiryDate);
  if (!['', 'yes', 'no', 'applied'].includes(wwccStatus)) errors.wwccStatus = 'Choose a valid option.';
  if (wwccStatus === 'yes') {
    if (wwccNumber.length < 2 || wwccNumber.length > 100) errors.wwccNumber = 'Enter your WWCC number.';
    wwccExpiryDate = validateDate(
      wwccExpiryDate,
      'wwccExpiryDate',
      errors,
      { required: true, notPast: true },
      today
    );
  } else {
    if (wwccNumber || wwccExpiryDate) errors.wwccStatus = 'Select Yes before entering WWCC details.';
    wwccExpiryDate = '';
  }

  const frequency = typeof source.frequency === 'string' ? source.frequency : '';
  if (!FREQUENCY_VALUES.has(frequency)) errors.frequency = 'Choose how often you would like to volunteer.';
  const preferredDays = validateSelection<Weekday>(source.preferredDays, WEEKDAY_VALUES, 'preferredDays', errors);

  const mediaConsent = typeof source.mediaConsent === 'string' ? source.mediaConsent : '';
  if (mediaConsent !== 'consent' && mediaConsent !== 'decline') {
    errors.mediaConsent = 'Choose a photography and media preference.';
  }
  if (source.agreementAccepted !== true) errors.agreementAccepted = 'Accept the volunteer agreement and declaration.';

  if (Object.keys(errors).length > 0) return { success: false, errors };

  return {
    success: true,
    data: {
      fullName,
      preferredName,
      isUnder18: isUnder18 as boolean,
      dateOfBirth,
      address,
      phone,
      phoneNormalized,
      email,
      emailNormalized,
      referralSources,
      referralOther: referralSources.includes('other') ? referralOther : '',
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      emergencyContactPhoneNormalized,
      interests,
      interestOther: interests.includes('other') ? interestOther : '',
      skillsExperience,
      qualifications: {
        firstAid,
        firstAidExpiry,
        cpr,
        cprExpiry,
        chemicalHandling,
        chemicalHandlingExpiry,
        chainsaw,
        other: qualificationOther,
        otherDetails: qualificationOtherDetails,
      },
      licences,
      licenceOther: licences.includes('other') ? licenceOther : '',
      wwccStatus: wwccStatus as WwccStatus,
      wwccNumber: wwccStatus === 'yes' ? wwccNumber : '',
      wwccExpiryDate,
      frequency: frequency as VolunteeringFrequency,
      preferredDays,
      accessibilitySupport,
      medicalInformation,
      mediaConsent: mediaConsent as Exclude<MediaConsent, ''>,
      declarationName,
      agreementAccepted: true,
    },
  };
}
