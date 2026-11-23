import {
  LICENCES,
  REFERRAL_SOURCES,
  VOLUNTEER_INTERESTS,
  VOLUNTEERING_FREQUENCIES,
  WEEKDAYS,
} from './volunteerRegistration';
import {
  displayValue,
  formatDate,
  formatDateTime,
  humanize,
  parseJsonList,
  parseQualifications,
  yesNo,
  type DetailGroup,
} from './admin';

/** A volunteer registration form exactly as submitted. Shown on the volunteer's profile. */
export interface VolunteerRegistration {
  id: number;
  full_name: string;
  preferred_name: string;
  is_under_18: number;
  date_of_birth: string;
  address: string;
  phone: string;
  email: string;
  referral_sources_json: string;
  referral_other: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  interests_json: string;
  interest_other: string;
  skills_experience: string;
  qualifications_json: string;
  licences_json: string;
  licence_other: string;
  wwcc_status: string;
  wwcc_number: string;
  wwcc_expiry_date: string;
  frequency: string;
  preferred_days_json: string;
  accessibility_support: string;
  medical_information: string;
  media_consent: string;
  declaration_name: string;
  agreement_accepted: number;
  form_version: string;
  registered_at: string;
}

export const REGISTRATION_COLUMNS = `id, full_name, preferred_name, is_under_18, date_of_birth, address, phone, email,
  referral_sources_json, referral_other, emergency_contact_name, emergency_contact_relationship,
  emergency_contact_phone, interests_json, interest_other, skills_experience, qualifications_json,
  licences_json, licence_other, wwcc_status, wwcc_number, wwcc_expiry_date, frequency,
  preferred_days_json, accessibility_support, medical_information, media_consent, declaration_name,
  agreement_accepted, form_version, registered_at`;

const referralLabels = new Map<string, string>(REFERRAL_SOURCES.map(({ value, label }) => [value, label]));
const interestLabels = new Map<string, string>(VOLUNTEER_INTERESTS.map(({ value, label }) => [value, label]));
const licenceLabels = new Map<string, string>(LICENCES.map(({ value, label }) => [value, label]));
const weekdayLabels = new Map<string, string>(WEEKDAYS.map(({ value, label }) => [value, label]));
const frequencyLabels = new Map<string, string>(VOLUNTEERING_FREQUENCIES.map(({ value, label }) => [value, label]));

export function frequencyLabel(value: string): string {
  return value ? frequencyLabels.get(value) || humanize(value) : 'Not provided';
}

export function wwccLabel(value: string): string {
  return ({ yes: 'Yes', no: 'No', applied: 'Applied for' } as Record<string, string>)[value] || 'Not answered';
}

export function mediaConsentLabel(value: string): string {
  return ({ consent: 'Consent given', decline: 'Consent declined' } as Record<string, string>)[value] || displayValue(value);
}

export function registrationDetailGroups(registration: VolunteerRegistration): DetailGroup[] {
  return [
    {
      heading: 'Personal details',
      items: [
        { label: 'Full name', value: displayValue(registration.full_name) },
        { label: 'Preferred name', value: displayValue(registration.preferred_name) },
        { label: 'Under 18', value: yesNo(registration.is_under_18) },
        { label: 'Date of birth', value: formatDate(registration.date_of_birth) },
        { label: 'Address', value: displayValue(registration.address) },
        { label: 'Phone', value: displayValue(registration.phone) },
        { label: 'Email', value: displayValue(registration.email) },
      ],
    },
    {
      heading: 'Emergency contact',
      items: [
        { label: 'Name', value: displayValue(registration.emergency_contact_name) },
        { label: 'Relationship', value: displayValue(registration.emergency_contact_relationship) },
        { label: 'Phone', value: displayValue(registration.emergency_contact_phone) },
      ],
    },
    {
      heading: 'Working With Children Check',
      items: [
        { label: 'Status', value: wwccLabel(registration.wwcc_status) },
        { label: 'WWCC number', value: displayValue(registration.wwcc_number) },
        { label: 'Expiry date', value: formatDate(registration.wwcc_expiry_date) },
      ],
    },
    {
      heading: 'Support, consent and declaration',
      items: [
        { label: 'Accessibility and support', value: displayValue(registration.accessibility_support) },
        { label: 'Medical information', value: displayValue(registration.medical_information) },
        { label: 'Photography and media', value: mediaConsentLabel(registration.media_consent) },
        { label: 'Declaration name', value: displayValue(registration.declaration_name) },
        { label: 'Agreement accepted', value: yesNo(registration.agreement_accepted) },
      ],
    },
    {
      heading: 'Interests and experience',
      items: [
        { label: 'Volunteer interests', value: parseJsonList(registration.interests_json, interestLabels) },
        { label: 'Other interest', value: displayValue(registration.interest_other) },
        { label: 'Skills and experience', value: displayValue(registration.skills_experience) },
      ],
    },
    {
      heading: 'Qualifications and licences',
      items: [
        { label: 'Qualifications', value: parseQualifications(registration.qualifications_json) },
        { label: 'Licences', value: parseJsonList(registration.licences_json, licenceLabels) },
        { label: 'Other licence', value: displayValue(registration.licence_other) },
      ],
    },
    {
      heading: 'Availability',
      items: [
        { label: 'Frequency', value: frequencyLabel(registration.frequency) },
        { label: 'Preferred days', value: parseJsonList(registration.preferred_days_json, weekdayLabels) },
      ],
    },
    {
      heading: 'Referral',
      items: [
        { label: 'Referral sources', value: parseJsonList(registration.referral_sources_json, referralLabels) },
        { label: 'Other referral source', value: displayValue(registration.referral_other) },
      ],
    },
    {
      heading: 'Form',
      items: [
        { label: 'Submitted', value: formatDateTime(registration.registered_at) },
        { label: 'Form version', value: displayValue(registration.form_version) },
        { label: 'Record ID', value: String(registration.id) },
      ],
    },
  ];
}
