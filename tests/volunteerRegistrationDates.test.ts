import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeDateInput,
  validateVolunteerRegistration,
  type VolunteerRegistrationInput,
} from '../src/lib/volunteerRegistration.ts';

const today = '2026-08-25';

function validRegistration(): VolunteerRegistrationInput {
  return {
    fullName: 'Test Volunteer',
    preferredName: '',
    isUnder18: true,
    dateOfBirth: '25/08/2010',
    address: '1 Test Street, Adelaide SA',
    phone: '0412 345 678',
    email: 'volunteer@example.com',
    referralSources: ['forktree-website'],
    referralOther: '',
    emergencyContactName: 'Test Contact',
    emergencyContactRelationship: 'Parent',
    emergencyContactPhone: '0412 345 679',
    interests: ['tree-planting'],
    interestOther: '',
    skillsExperience: '',
    qualifications: {
      firstAid: false,
      firstAidExpiry: '',
      cpr: false,
      cprExpiry: '',
      chemicalHandling: false,
      chemicalHandlingExpiry: '',
      chainsaw: false,
      other: false,
      otherDetails: '',
    },
    licences: [],
    licenceOther: '',
    wwccStatus: '',
    wwccNumber: '',
    wwccExpiryDate: '',
    frequency: 'occasionally',
    preferredDays: [],
    accessibilitySupport: '',
    medicalInformation: '',
    mediaConsent: 'decline',
    declarationName: 'Test Volunteer',
    agreementAccepted: true,
    website: '',
  };
}

test('Australian dates normalize to ISO while ISO API input remains supported', () => {
  assert.equal(normalizeDateInput('25/08/2026'), '2026-08-25');
  assert.equal(normalizeDateInput('2026-08-25'), '2026-08-25');
  assert.equal(normalizeDateInput('31/02/2026'), null);
  assert.equal(normalizeDateInput('08/25/2026'), null);

  const result = validateVolunteerRegistration(validRegistration(), today);
  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.dateOfBirth, '2010-08-25');
});

test('Australian date validation still enforces past and future constraints', () => {
  const futureBirthDate = validateVolunteerRegistration(
    { ...validRegistration(), dateOfBirth: '26/08/2026' },
    today
  );
  assert.equal(futureBirthDate.success, false);
  if (!futureBirthDate.success) {
    assert.equal(futureBirthDate.errors.dateOfBirth, 'Enter a valid date in DD/MM/YYYY format.');
  }

  const expiredFirstAid = validRegistration();
  expiredFirstAid.qualifications = {
    ...expiredFirstAid.qualifications,
    firstAid: true,
    firstAidExpiry: '24/08/2026',
  };
  const expiredResult = validateVolunteerRegistration(expiredFirstAid, today);
  assert.equal(expiredResult.success, false);
  if (!expiredResult.success) {
    assert.equal(
      expiredResult.errors.qualificationFirstAidExpiry,
      'Enter a valid date in DD/MM/YYYY format.'
    );
  }

  expiredFirstAid.qualifications.firstAidExpiry = '25/08/2026';
  const currentResult = validateVolunteerRegistration(expiredFirstAid, today);
  assert.equal(currentResult.success, true);
  if (currentResult.success) {
    assert.equal(currentResult.data.qualifications.firstAidExpiry, '2026-08-25');
  }
});
