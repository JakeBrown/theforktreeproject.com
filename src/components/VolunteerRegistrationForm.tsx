import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  LICENCES,
  REFERRAL_SOURCES,
  VOLUNTEER_INTERESTS,
  VOLUNTEERING_FREQUENCIES,
  WEEKDAYS,
  validateVolunteerRegistration,
  type VolunteerQualificationsInput,
  type VolunteerRegistrationInput,
} from '../lib/volunteerRegistration';
import { getAdelaideDate } from '../lib/volunteerSignIn';

type FieldErrors = Record<string, string>;
type FormStatus = 'idle' | 'submitting' | 'success';
type SelectionField = 'referralSources' | 'interests' | 'licences' | 'preferredDays';

const emptyQualifications = (): VolunteerQualificationsInput => ({
  firstAid: false,
  firstAidExpiry: '',
  cpr: false,
  cprExpiry: '',
  chemicalHandling: false,
  chemicalHandlingExpiry: '',
  chainsaw: false,
  other: false,
  otherDetails: '',
});

const emptyForm = (): VolunteerRegistrationInput => ({
  fullName: '',
  preferredName: '',
  isUnder18: null,
  dateOfBirth: '',
  address: '',
  phone: '',
  email: '',
  referralSources: [],
  referralOther: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactPhone: '',
  interests: [],
  interestOther: '',
  skillsExperience: '',
  qualifications: emptyQualifications(),
  licences: [],
  licenceOther: '',
  wwccStatus: '',
  wwccNumber: '',
  wwccExpiryDate: '',
  frequency: '',
  preferredDays: [],
  accessibilitySupport: '',
  medicalInformation: '',
  mediaConsent: '',
  declarationName: '',
  agreementAccepted: false,
  website: '',
});

function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? <span id={id} className="registration-error">{error}</span> : null;
}

export default function VolunteerRegistrationForm() {
  const [formData, setFormData] = useState<VolunteerRegistrationInput>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorFocusVersion, setErrorFocusVersion] = useState(0);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);

  useEffect(() => {
    if (status === 'success') successHeading.current?.focus();
  }, [status]);

  useEffect(() => {
    if (errorFocusVersion > 0) errorSummary.current?.focus();
  }, [errorFocusVersion]);

  const clearErrors = (...keys: string[]) => {
    if (!keys.some((key) => errors[key])) return;
    setErrors((current) => {
      const next = { ...current };
      keys.forEach((key) => delete next[key]);
      return next;
    });
  };

  const updateField = <Key extends keyof VolunteerRegistrationInput>(
    key: Key,
    value: VolunteerRegistrationInput[Key]
  ) => {
    setFormData((current) => ({ ...current, [key]: value }));
    clearErrors(String(key));
  };

  const toggleSelection = (field: SelectionField, value: string, checked: boolean) => {
    setFormData((current) => {
      const currentValues = current[field] as string[];
      const nextValues = checked
        ? [...currentValues, value]
        : currentValues.filter((item) => item !== value);
      const next = { ...current, [field]: nextValues } as VolunteerRegistrationInput;

      if (!checked && value === 'other') {
        if (field === 'referralSources') next.referralOther = '';
        if (field === 'interests') next.interestOther = '';
        if (field === 'licences') next.licenceOther = '';
      }
      return next;
    });
    clearErrors(field);
    if (!checked && value === 'other') {
      if (field === 'referralSources') clearErrors('referralOther');
      if (field === 'interests') clearErrors('interestOther');
      if (field === 'licences') clearErrors('licenceOther');
    }
  };

  const updateQualification = <Key extends keyof VolunteerQualificationsInput>(
    key: Key,
    value: VolunteerQualificationsInput[Key]
  ) => {
    setFormData((current) => ({
      ...current,
      qualifications: { ...current.qualifications, [key]: value },
    }));
    clearErrors(
      'qualifications',
      key === 'firstAidExpiry' || key === 'firstAid' ? 'qualificationFirstAidExpiry' : '',
      key === 'cprExpiry' || key === 'cpr' ? 'qualificationCprExpiry' : '',
      key === 'chemicalHandlingExpiry' || key === 'chemicalHandling'
        ? 'qualificationChemicalHandlingExpiry'
        : '',
      key === 'other' || key === 'otherDetails' ? 'qualificationOtherDetails' : ''
    );
  };

  const handleUnder18Change = (isUnder18: boolean) => {
    setFormData((current) => ({
      ...current,
      isUnder18,
      dateOfBirth: isUnder18 ? current.dateOfBirth : '',
    }));
    clearErrors('isUnder18', 'dateOfBirth');
  };

  const handleWwccChange = (wwccStatus: VolunteerRegistrationInput['wwccStatus']) => {
    setFormData((current) => ({
      ...current,
      wwccStatus,
      wwccNumber: wwccStatus === 'yes' ? current.wwccNumber : '',
      wwccExpiryDate: wwccStatus === 'yes' ? current.wwccExpiryDate : '',
    }));
    clearErrors('wwccStatus', 'wwccNumber', 'wwccExpiryDate');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;

    setFormError('');
    const validation = validateVolunteerRegistration(formData);
    if (!validation.success) {
      setErrors(validation.errors);
      setErrorFocusVersion((current) => current + 1);
      return;
    }

    setErrors({});
    submitting.current = true;
    setStatus('submitting');

    try {
      const response = await fetch('/api/volunteer-registration', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        errors?: FieldErrors;
      };

      if (!response.ok || !result.ok) {
        setErrors(result.errors || {});
        setFormError(result.message || 'We couldn’t submit your registration. Please try again.');
        submitting.current = false;
        setStatus('idle');
        setErrorFocusVersion((current) => current + 1);
        return;
      }

      setFormData(emptyForm());
      setStatus('success');
    } catch {
      setFormError('We couldn’t submit your registration. Please check your connection and try again.');
      submitting.current = false;
      setStatus('idle');
      setErrorFocusVersion((current) => current + 1);
    }
  };

  const startAnotherRegistration = () => {
    setErrors({});
    setFormError('');
    setFormData(emptyForm());
    submitting.current = false;
    setStatus('idle');
  };

  const errorMessages = Array.from(new Set(Object.values(errors)));

  if (status === 'success') {
    return (
      <section className="registration-success" aria-live="polite">
        <div className="registration-success__mark" aria-hidden="true">✓</div>
        <h2 ref={successHeading} tabIndex={-1}>Registration received</h2>
        <p>Thank you for registering to volunteer with The Forktree Project. We’ll be in touch about suitable opportunities.</p>
        <div className="registration-success__actions">
          <a className="registration-button" href="/get-involved">Return to Get Involved</a>
          <button type="button" className="registration-button registration-button--secondary" onClick={startAnotherRegistration}>
            Register another volunteer
          </button>
        </div>
        <style>{styles}</style>
      </section>
    );
  }

  return (
    <form className="registration-form" onSubmit={handleSubmit} noValidate aria-busy={status === 'submitting'}>
      <p className="registration-required-note"><span aria-hidden="true">*</span> Required fields</p>

      {(formError || errorMessages.length > 0) && (
        <div ref={errorSummary} className="registration-error-summary" role="alert" tabIndex={-1}>
          <h2>Check your registration</h2>
          {formError && <p>{formError}</p>}
          {errorMessages.length > 0 && (
            <ul>
              {errorMessages.map((message) => <li key={message}>{message}</li>)}
            </ul>
          )}
        </div>
      )}

      <section className="registration-section" aria-labelledby="registration-personal-heading">
        <div className="registration-section__heading">
          <p>01</p>
          <div>
            <h2 id="registration-personal-heading">Personal details</h2>
            <span>Tell us how to contact you.</span>
          </div>
        </div>

        <div className="registration-grid">
          <div className="registration-field">
            <label htmlFor="registration-full-name">Full name <span aria-hidden="true">*</span></label>
            <input id="registration-full-name" name="fullName" type="text" autoComplete="name" maxLength={120} value={formData.fullName} onChange={(event) => updateField('fullName', event.target.value)} aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'registration-full-name-error' : undefined} required />
            <FieldError id="registration-full-name-error" error={errors.fullName} />
          </div>

          <div className="registration-field">
            <label htmlFor="registration-preferred-name">Preferred name <span className="registration-optional">Optional</span></label>
            <input id="registration-preferred-name" name="preferredName" type="text" autoComplete="nickname" maxLength={120} value={formData.preferredName} onChange={(event) => updateField('preferredName', event.target.value)} aria-invalid={Boolean(errors.preferredName)} aria-describedby={errors.preferredName ? 'registration-preferred-name-error' : undefined} />
            <FieldError id="registration-preferred-name-error" error={errors.preferredName} />
          </div>

          <fieldset className="registration-field registration-field--full registration-choice-group" aria-required="true" aria-invalid={Boolean(errors.isUnder18)} aria-describedby={`registration-age-help${errors.isUnder18 ? ' registration-age-error' : ''}`}>
            <legend>Are you under 18? <span aria-hidden="true">*</span></legend>
            <p id="registration-age-help" className="registration-help">Volunteers under 18 may register. Date of birth is only collected for under-18 registrations.</p>
            <div className="registration-options registration-options--inline">
              <label className="registration-option"><input type="radio" name="isUnder18" required checked={formData.isUnder18 === true} onChange={() => handleUnder18Change(true)} /><span>Yes</span></label>
              <label className="registration-option"><input type="radio" name="isUnder18" required checked={formData.isUnder18 === false} onChange={() => handleUnder18Change(false)} /><span>No</span></label>
            </div>
            <FieldError id="registration-age-error" error={errors.isUnder18} />
          </fieldset>

          {formData.isUnder18 === true && (
            <div className="registration-field registration-field--full registration-field--compact">
              <label htmlFor="registration-date-of-birth">Date of birth <span aria-hidden="true">*</span></label>
              <input id="registration-date-of-birth" name="dateOfBirth" type="date" autoComplete="bday" max={getAdelaideDate()} value={formData.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} aria-invalid={Boolean(errors.dateOfBirth)} aria-describedby={errors.dateOfBirth ? 'registration-date-of-birth-error' : undefined} required />
              <FieldError id="registration-date-of-birth-error" error={errors.dateOfBirth} />
            </div>
          )}

          <div className="registration-field registration-field--full">
            <label htmlFor="registration-address">Address <span aria-hidden="true">*</span></label>
            <textarea id="registration-address" name="address" autoComplete="street-address" rows={3} maxLength={500} value={formData.address} onChange={(event) => updateField('address', event.target.value)} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? 'registration-address-error' : undefined} required />
            <FieldError id="registration-address-error" error={errors.address} />
          </div>

          <div className="registration-field">
            <label htmlFor="registration-phone">Phone number <span aria-hidden="true">*</span></label>
            <input id="registration-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} value={formData.phone} onChange={(event) => updateField('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'registration-phone-error' : undefined} required />
            <FieldError id="registration-phone-error" error={errors.phone} />
          </div>

          <div className="registration-field">
            <label htmlFor="registration-email">Email address <span aria-hidden="true">*</span></label>
            <input id="registration-email" name="email" type="email" inputMode="email" autoComplete="email" maxLength={254} value={formData.email} onChange={(event) => updateField('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'registration-email-error' : undefined} required />
            <FieldError id="registration-email-error" error={errors.email} />
          </div>
        </div>
      </section>

      <section className="registration-section" aria-labelledby="registration-referral-heading">
        <div className="registration-section__heading">
          <p>02</p>
          <div>
            <h2 id="registration-referral-heading">How did you hear about The Forktree Project?</h2>
            <span>Please tell us how you first heard about volunteering with us.</span>
          </div>
        </div>
        <fieldset className="registration-choice-group" aria-required="true" aria-invalid={Boolean(errors.referralSources)} aria-describedby={errors.referralSources ? 'registration-referrals-error' : undefined}>
          <legend>Choose at least one referral source <span aria-hidden="true">*</span></legend>
          <div className="registration-options registration-options--two-column">
            {REFERRAL_SOURCES.map((option) => (
              <label className="registration-option" key={option.value}>
                <input type="checkbox" name="referralSources" value={option.value} checked={formData.referralSources.includes(option.value)} onChange={(event) => toggleSelection('referralSources', option.value, event.target.checked)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="registration-referrals-error" error={errors.referralSources} />
        </fieldset>
        {formData.referralSources.includes('other') && (
          <div className="registration-field registration-conditional">
            <label htmlFor="registration-referral-other">Other referral source <span aria-hidden="true">*</span></label>
            <input id="registration-referral-other" name="referralOther" type="text" maxLength={200} value={formData.referralOther} onChange={(event) => updateField('referralOther', event.target.value)} aria-invalid={Boolean(errors.referralOther)} aria-describedby={errors.referralOther ? 'registration-referral-other-error' : undefined} required />
            <FieldError id="registration-referral-other-error" error={errors.referralOther} />
          </div>
        )}
      </section>

      <section className="registration-section" aria-labelledby="registration-emergency-heading">
        <div className="registration-section__heading">
          <p>03</p>
          <div>
            <h2 id="registration-emergency-heading">Emergency contact</h2>
            <span>Someone we can contact if needed while you are volunteering.</span>
          </div>
        </div>
        <div className="registration-grid">
          <div className="registration-field">
            <label htmlFor="registration-emergency-name">Name <span aria-hidden="true">*</span></label>
            <input id="registration-emergency-name" name="emergencyContactName" type="text" maxLength={120} value={formData.emergencyContactName} onChange={(event) => updateField('emergencyContactName', event.target.value)} aria-invalid={Boolean(errors.emergencyContactName)} aria-describedby={errors.emergencyContactName ? 'registration-emergency-name-error' : undefined} required />
            <FieldError id="registration-emergency-name-error" error={errors.emergencyContactName} />
          </div>
          <div className="registration-field">
            <label htmlFor="registration-emergency-relationship">Relationship <span aria-hidden="true">*</span></label>
            <input id="registration-emergency-relationship" name="emergencyContactRelationship" type="text" maxLength={100} value={formData.emergencyContactRelationship} onChange={(event) => updateField('emergencyContactRelationship', event.target.value)} aria-invalid={Boolean(errors.emergencyContactRelationship)} aria-describedby={errors.emergencyContactRelationship ? 'registration-emergency-relationship-error' : undefined} required />
            <FieldError id="registration-emergency-relationship-error" error={errors.emergencyContactRelationship} />
          </div>
          <div className="registration-field registration-field--full registration-field--compact">
            <label htmlFor="registration-emergency-phone">Phone number <span aria-hidden="true">*</span></label>
            <input id="registration-emergency-phone" name="emergencyContactPhone" type="tel" inputMode="tel" maxLength={30} value={formData.emergencyContactPhone} onChange={(event) => updateField('emergencyContactPhone', event.target.value)} aria-invalid={Boolean(errors.emergencyContactPhone)} aria-describedby={errors.emergencyContactPhone ? 'registration-emergency-phone-error' : undefined} required />
            <FieldError id="registration-emergency-phone-error" error={errors.emergencyContactPhone} />
          </div>
        </div>
      </section>

      <section className="registration-section" aria-labelledby="registration-interests-heading">
        <div className="registration-section__heading">
          <p>04</p>
          <div>
            <h2 id="registration-interests-heading">Volunteer interests</h2>
            <span>Which activities are you interested in? Tick all that apply.</span>
          </div>
        </div>
        <fieldset className="registration-choice-group" aria-required="true" aria-invalid={Boolean(errors.interests)} aria-describedby={errors.interests ? 'registration-interests-error' : undefined}>
          <legend>Choose at least one activity <span aria-hidden="true">*</span></legend>
          <div className="registration-options registration-options--two-column">
            {VOLUNTEER_INTERESTS.map((option) => (
              <label className="registration-option" key={option.value}>
                <input type="checkbox" name="interests" value={option.value} checked={formData.interests.includes(option.value)} onChange={(event) => toggleSelection('interests', option.value, event.target.checked)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="registration-interests-error" error={errors.interests} />
        </fieldset>
        {formData.interests.includes('other') && (
          <div className="registration-field registration-conditional">
            <label htmlFor="registration-interest-other">Other activity <span aria-hidden="true">*</span></label>
            <input id="registration-interest-other" name="interestOther" type="text" maxLength={200} value={formData.interestOther} onChange={(event) => updateField('interestOther', event.target.value)} aria-invalid={Boolean(errors.interestOther)} aria-describedby={errors.interestOther ? 'registration-interest-other-error' : undefined} required />
            <FieldError id="registration-interest-other-error" error={errors.interestOther} />
          </div>
        )}

        <div className="registration-field registration-field--spaced">
          <label htmlFor="registration-skills">Skills, qualifications and experience <span className="registration-optional">Optional</span></label>
          <p className="registration-help" id="registration-skills-help">Tell us about any skills, qualifications, licences or experience you would like to contribute.</p>
          <textarea id="registration-skills" name="skillsExperience" rows={5} maxLength={4000} value={formData.skillsExperience} onChange={(event) => updateField('skillsExperience', event.target.value)} aria-invalid={Boolean(errors.skillsExperience)} aria-describedby={`registration-skills-help${errors.skillsExperience ? ' registration-skills-error' : ''}`} />
          <FieldError id="registration-skills-error" error={errors.skillsExperience} />
        </div>
      </section>

      <section className="registration-section" aria-labelledby="registration-credentials-heading">
        <div className="registration-section__heading">
          <p>05</p>
          <div>
            <h2 id="registration-credentials-heading">Qualifications and licences</h2>
            <span>Optional details that can help us match you with suitable work.</span>
          </div>
        </div>

        <fieldset className="registration-choice-group">
          <legend>Current qualifications <span className="registration-optional">Optional</span></legend>
          <div className="registration-options registration-options--stacked">
            <div className="registration-option-detail">
              <label className="registration-option"><input type="checkbox" checked={formData.qualifications.firstAid} onChange={(event) => { updateQualification('firstAid', event.target.checked); if (!event.target.checked) updateQualification('firstAidExpiry', ''); }} /><span>First Aid Certificate</span></label>
              {formData.qualifications.firstAid && <div className="registration-field"><label htmlFor="registration-first-aid-expiry">Expiry date <span aria-hidden="true">*</span></label><input id="registration-first-aid-expiry" type="date" required min={getAdelaideDate()} value={formData.qualifications.firstAidExpiry} onChange={(event) => updateQualification('firstAidExpiry', event.target.value)} aria-invalid={Boolean(errors.qualificationFirstAidExpiry)} aria-describedby={errors.qualificationFirstAidExpiry ? 'registration-first-aid-expiry-error' : undefined} /><FieldError id="registration-first-aid-expiry-error" error={errors.qualificationFirstAidExpiry} /></div>}
            </div>
            <div className="registration-option-detail">
              <label className="registration-option"><input type="checkbox" checked={formData.qualifications.cpr} onChange={(event) => { updateQualification('cpr', event.target.checked); if (!event.target.checked) updateQualification('cprExpiry', ''); }} /><span>CPR Certificate</span></label>
              {formData.qualifications.cpr && <div className="registration-field"><label htmlFor="registration-cpr-expiry">Expiry date <span aria-hidden="true">*</span></label><input id="registration-cpr-expiry" type="date" required min={getAdelaideDate()} value={formData.qualifications.cprExpiry} onChange={(event) => updateQualification('cprExpiry', event.target.value)} aria-invalid={Boolean(errors.qualificationCprExpiry)} aria-describedby={errors.qualificationCprExpiry ? 'registration-cpr-expiry-error' : undefined} /><FieldError id="registration-cpr-expiry-error" error={errors.qualificationCprExpiry} /></div>}
            </div>
            <div className="registration-option-detail">
              <label className="registration-option"><input type="checkbox" checked={formData.qualifications.chemicalHandling} onChange={(event) => { updateQualification('chemicalHandling', event.target.checked); if (!event.target.checked) updateQualification('chemicalHandlingExpiry', ''); }} /><span>Chemical Handling (e.g. ChemCert)</span></label>
              {formData.qualifications.chemicalHandling && <div className="registration-field"><label htmlFor="registration-chemical-expiry">Expiry date <span aria-hidden="true">*</span></label><input id="registration-chemical-expiry" type="date" required min={getAdelaideDate()} value={formData.qualifications.chemicalHandlingExpiry} onChange={(event) => updateQualification('chemicalHandlingExpiry', event.target.value)} aria-invalid={Boolean(errors.qualificationChemicalHandlingExpiry)} aria-describedby={errors.qualificationChemicalHandlingExpiry ? 'registration-chemical-expiry-error' : undefined} /><FieldError id="registration-chemical-expiry-error" error={errors.qualificationChemicalHandlingExpiry} /></div>}
            </div>
            <label className="registration-option"><input type="checkbox" checked={formData.qualifications.chainsaw} onChange={(event) => updateQualification('chainsaw', event.target.checked)} /><span>Chainsaw Qualification</span></label>
            <div className="registration-option-detail">
              <label className="registration-option"><input type="checkbox" checked={formData.qualifications.other} onChange={(event) => { updateQualification('other', event.target.checked); if (!event.target.checked) updateQualification('otherDetails', ''); }} /><span>Other</span></label>
              {formData.qualifications.other && <div className="registration-field"><label htmlFor="registration-qualification-other">Other qualification <span aria-hidden="true">*</span></label><input id="registration-qualification-other" type="text" maxLength={200} value={formData.qualifications.otherDetails} onChange={(event) => updateQualification('otherDetails', event.target.value)} aria-invalid={Boolean(errors.qualificationOtherDetails)} aria-describedby={errors.qualificationOtherDetails ? 'registration-qualification-other-error' : undefined} /><FieldError id="registration-qualification-other-error" error={errors.qualificationOtherDetails} /></div>}
            </div>
          </div>
          <FieldError id="registration-qualifications-error" error={errors.qualifications} />
        </fieldset>

        <fieldset className="registration-choice-group registration-field--spaced" aria-describedby={errors.licences ? 'registration-licences-error' : undefined}>
          <legend>Licences <span className="registration-optional">Optional</span></legend>
          <div className="registration-options registration-options--two-column">
            {LICENCES.map((option) => (
              <label className="registration-option" key={option.value}>
                <input type="checkbox" name="licences" value={option.value} checked={formData.licences.includes(option.value)} onChange={(event) => toggleSelection('licences', option.value, event.target.checked)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="registration-licences-error" error={errors.licences} />
        </fieldset>
        {formData.licences.includes('other') && (
          <div className="registration-field registration-conditional">
            <label htmlFor="registration-licence-other">Other licence <span aria-hidden="true">*</span></label>
            <input id="registration-licence-other" name="licenceOther" type="text" maxLength={200} value={formData.licenceOther} onChange={(event) => updateField('licenceOther', event.target.value)} aria-invalid={Boolean(errors.licenceOther)} aria-describedby={errors.licenceOther ? 'registration-licence-other-error' : undefined} required />
            <FieldError id="registration-licence-other-error" error={errors.licenceOther} />
          </div>
        )}
      </section>

      <section className="registration-section" aria-labelledby="registration-wwcc-heading">
        <div className="registration-section__heading">
          <p>06</p>
          <div>
            <h2 id="registration-wwcc-heading">Working With Children Check</h2>
            <span>Optional. Only required for volunteer roles involving children or young people.</span>
          </div>
        </div>
        <fieldset className="registration-choice-group" aria-describedby={errors.wwccStatus ? 'registration-wwcc-status-error' : undefined}>
          <legend>Do you currently hold a Working With Children Check?</legend>
          <div className="registration-options registration-options--inline">
            {([['', 'Not answered'], ['yes', 'Yes'], ['no', 'No'], ['applied', 'Applied for']] as const).map(([value, label]) => (
              <label className="registration-option" key={value}><input type="radio" name="wwccStatus" value={value} checked={formData.wwccStatus === value} onChange={() => handleWwccChange(value)} /><span>{label}</span></label>
            ))}
          </div>
          <FieldError id="registration-wwcc-status-error" error={errors.wwccStatus} />
        </fieldset>
        {formData.wwccStatus === 'yes' && (
          <div className="registration-grid registration-conditional">
            <div className="registration-field">
              <label htmlFor="registration-wwcc-number">WWCC number <span aria-hidden="true">*</span></label>
              <input id="registration-wwcc-number" name="wwccNumber" type="text" required maxLength={100} value={formData.wwccNumber} onChange={(event) => updateField('wwccNumber', event.target.value)} aria-invalid={Boolean(errors.wwccNumber)} aria-describedby={errors.wwccNumber ? 'registration-wwcc-number-error' : undefined} />
              <FieldError id="registration-wwcc-number-error" error={errors.wwccNumber} />
            </div>
            <div className="registration-field">
              <label htmlFor="registration-wwcc-expiry">Expiry date <span aria-hidden="true">*</span></label>
              <input id="registration-wwcc-expiry" name="wwccExpiryDate" type="date" required min={getAdelaideDate()} value={formData.wwccExpiryDate} onChange={(event) => updateField('wwccExpiryDate', event.target.value)} aria-invalid={Boolean(errors.wwccExpiryDate)} aria-describedby={errors.wwccExpiryDate ? 'registration-wwcc-expiry-error' : undefined} />
              <FieldError id="registration-wwcc-expiry-error" error={errors.wwccExpiryDate} />
            </div>
          </div>
        )}
      </section>

      <section className="registration-section" aria-labelledby="registration-availability-heading">
        <div className="registration-section__heading">
          <p>07</p>
          <div>
            <h2 id="registration-availability-heading">Availability</h2>
            <span>Let us know what generally suits you.</span>
          </div>
        </div>
        <fieldset className="registration-choice-group" aria-required="true" aria-invalid={Boolean(errors.frequency)} aria-describedby={errors.frequency ? 'registration-frequency-error' : undefined}>
          <legend>How often would you like to volunteer? <span aria-hidden="true">*</span></legend>
          <div className="registration-options registration-options--two-column">
            {VOLUNTEERING_FREQUENCIES.map((option) => (
              <label className="registration-option" key={option.value}><input type="radio" name="frequency" required value={option.value} checked={formData.frequency === option.value} onChange={() => updateField('frequency', option.value)} /><span>{option.label}</span></label>
            ))}
          </div>
          <FieldError id="registration-frequency-error" error={errors.frequency} />
        </fieldset>
        <fieldset className="registration-choice-group registration-field--spaced" aria-describedby={errors.preferredDays ? 'registration-days-error' : undefined}>
          <legend>Preferred days <span className="registration-optional">Optional</span></legend>
          <div className="registration-options registration-options--days">
            {WEEKDAYS.map((option) => (
              <label className="registration-option" key={option.value}><input type="checkbox" name="preferredDays" value={option.value} checked={formData.preferredDays.includes(option.value)} onChange={(event) => toggleSelection('preferredDays', option.value, event.target.checked)} /><span>{option.label}</span></label>
            ))}
          </div>
          <FieldError id="registration-days-error" error={errors.preferredDays} />
        </fieldset>
      </section>

      <section className="registration-section" aria-labelledby="registration-support-heading">
        <div className="registration-section__heading">
          <p>08</p>
          <div>
            <h2 id="registration-support-heading">Accessibility and safety</h2>
            <span>Optional information that helps us provide a safe, comfortable experience.</span>
          </div>
        </div>
        <div className="registration-field">
          <label htmlFor="registration-accessibility">Accessibility and support <span className="registration-optional">Optional</span></label>
          <p className="registration-help" id="registration-accessibility-help">Is there anything we should know to help make your volunteering experience safe, comfortable and enjoyable?</p>
          <textarea id="registration-accessibility" name="accessibilitySupport" rows={5} maxLength={4000} value={formData.accessibilitySupport} onChange={(event) => updateField('accessibilitySupport', event.target.value)} aria-invalid={Boolean(errors.accessibilitySupport)} aria-describedby={`registration-accessibility-help${errors.accessibilitySupport ? ' registration-accessibility-error' : ''}`} />
          <FieldError id="registration-accessibility-error" error={errors.accessibilitySupport} />
        </div>
        <div className="registration-field registration-field--spaced">
          <label htmlFor="registration-medical">Medical information <span className="registration-optional">Optional</span></label>
          <p className="registration-help" id="registration-medical-help">Do you have any allergies, medical conditions or health considerations that may affect your safety while volunteering or that emergency responders should know about?</p>
          <textarea id="registration-medical" name="medicalInformation" rows={5} maxLength={4000} value={formData.medicalInformation} onChange={(event) => updateField('medicalInformation', event.target.value)} aria-invalid={Boolean(errors.medicalInformation)} aria-describedby={`registration-medical-help${errors.medicalInformation ? ' registration-medical-error' : ''}`} />
          <FieldError id="registration-medical-error" error={errors.medicalInformation} />
        </div>
      </section>

      <section className="registration-section" aria-labelledby="registration-consent-heading">
        <div className="registration-section__heading">
          <p>09</p>
          <div>
            <h2 id="registration-consent-heading">Consent and agreement</h2>
            <span>Review the information below before signing.</span>
          </div>
        </div>

        <fieldset className="registration-choice-group" aria-required="true" aria-invalid={Boolean(errors.mediaConsent)} aria-describedby={`registration-media-help${errors.mediaConsent ? ' registration-media-error' : ''}`}>
          <legend>Photography and media consent <span aria-hidden="true">*</span></legend>
          <p id="registration-media-help" className="registration-help">Photographs and videos may be taken during volunteer activities for use in The Forktree Project’s website, social media, newsletters, reports and promotional material. Please indicate your preference.</p>
          <div className="registration-options registration-options--stacked">
            <label className="registration-option"><input type="radio" name="mediaConsent" required value="consent" checked={formData.mediaConsent === 'consent'} onChange={() => updateField('mediaConsent', 'consent')} /><span>I consent to photographs/videos of me being used.</span></label>
            <label className="registration-option"><input type="radio" name="mediaConsent" required value="decline" checked={formData.mediaConsent === 'decline'} onChange={() => updateField('mediaConsent', 'decline')} /><span>I do not consent to photographs/videos of me being used.</span></label>
          </div>
          <FieldError id="registration-media-error" error={errors.mediaConsent} />
        </fieldset>

        <div className="registration-agreement">
          <h3>Volunteer agreement</h3>
          <p>As a volunteer with The Forktree Project, I agree to:</p>
          <ul>
            <li>Follow reasonable instructions provided by staff and volunteer leaders.</li>
            <li>Take reasonable care of my own health and safety and that of others.</li>
            <li>Treat fellow volunteers, staff, visitors and community members with respect.</li>
            <li>Help care for the environment, equipment and property.</li>
            <li>Participate in site inductions and safety briefings.</li>
            <li>Report hazards, incidents or injuries as soon as possible.</li>
            <li>Notify The Forktree Project if I am unable to attend a registered volunteer activity.</li>
          </ul>
        </div>

        <aside className="registration-privacy">
          <h3>Privacy statement</h3>
          <p>The information collected on this form is used solely to administer our volunteer program, communicate with you about volunteering opportunities and provide a safe volunteering environment.</p>
          <p>Your information will be stored securely and managed in accordance with applicable Australian privacy legislation.</p>
        </aside>

        <div className="registration-declaration">
          <h3>Declaration</h3>
          <p>I declare that the information provided in this form is true and correct to the best of my knowledge. I understand that volunteering with The Forktree Project involves outdoor physical activities and agree to follow all safety instructions provided by staff and volunteer leaders.</p>
          <div className="registration-field">
            <label htmlFor="registration-declaration-name">Type your full name <span aria-hidden="true">*</span></label>
            <p id="registration-declaration-help" className="registration-help">Typing your name records your electronic signature for this declaration.</p>
            <input id="registration-declaration-name" name="declarationName" type="text" autoComplete="name" maxLength={120} value={formData.declarationName} onChange={(event) => updateField('declarationName', event.target.value)} aria-invalid={Boolean(errors.declarationName)} aria-describedby={`registration-declaration-help${errors.declarationName ? ' registration-declaration-name-error' : ''}`} required />
            <FieldError id="registration-declaration-name-error" error={errors.declarationName} />
          </div>
          <label className="registration-option registration-option--agreement">
            <input type="checkbox" name="agreementAccepted" required checked={formData.agreementAccepted} onChange={(event) => updateField('agreementAccepted', event.target.checked)} aria-invalid={Boolean(errors.agreementAccepted)} aria-describedby={errors.agreementAccepted ? 'registration-agreement-error' : undefined} />
            <span>I have read and accept the volunteer agreement, privacy statement and declaration. <strong aria-hidden="true">*</strong></span>
          </label>
          <FieldError id="registration-agreement-error" error={errors.agreementAccepted} />
        </div>
      </section>

      <div className="registration-honeypot" aria-hidden="true" inert>
        <label htmlFor="registration-website">Website</label>
        <input id="registration-website" name="website" type="text" tabIndex={-1} aria-hidden="true" autoComplete="off" value={formData.website} onChange={(event) => updateField('website', event.target.value)} />
      </div>

      <div className="registration-submit">
        <p>Check your details before submitting. You can submit another registration later without overwriting this one.</p>
        <button type="submit" className="registration-button" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Submitting registration…' : 'Submit registration'}
        </button>
      </div>

      <style>{styles}</style>
    </form>
  );
}

const styles = `
  .registration-form { display: grid; gap: 0; color: #1f2a1f; }
  .registration-required-note { margin: 0 0 1.5rem; color: #687065; font-size: .82rem; text-align: right; }
  .registration-required-note span, .registration-field > label > span:not(.registration-optional), .registration-choice-group > legend > span:not(.registration-optional) { color: #a2392f; }
  .registration-error-summary { margin-bottom: 2rem; padding: 1.25rem 1.4rem; border-left: 4px solid #a2392f; border-radius: 3px; background: #faece9; color: #66231d; outline: none; }
  .registration-error-summary:focus { box-shadow: 0 0 0 3px rgba(162,57,47,.2); }
  .registration-error-summary h2 { margin: 0 0 .5rem; color: inherit; font-size: 1.2rem; }
  .registration-error-summary p { margin: 0 0 .5rem; }
  .registration-error-summary ul { margin: .5rem 0 0; padding-left: 1.25rem; }
  .registration-section { padding: 2.5rem 0; border-top: 1px solid #dde1da; }
  .registration-section:first-of-type { border-top: 0; padding-top: 0; }
  .registration-section__heading { display: grid; grid-template-columns: 2.5rem minmax(0,1fr); gap: 1rem; margin-bottom: 1.75rem; }
  .registration-section__heading > p { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; margin: 0; border-radius: 50%; background: #eaf1e7; color: #2d6927; font-size: .72rem; font-weight: 700; letter-spacing: .08em; }
  .registration-section__heading h2 { margin: 0; color: #1f2a1f; font-size: clamp(1.45rem, 4vw, 2rem); line-height: 1.2; }
  .registration-section__heading span { display: block; margin-top: .35rem; color: #687065; font-size: .9rem; line-height: 1.55; }
  .registration-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 1.3rem; }
  .registration-field { display: grid; align-content: start; gap: .45rem; min-width: 0; }
  .registration-field--full { grid-column: 1 / -1; }
  .registration-field--compact { max-width: 24rem; }
  .registration-field--spaced { margin-top: 1.75rem; }
  .registration-field label, .registration-choice-group legend { color: #263424; font-size: .78rem; font-weight: 650; letter-spacing: .08em; line-height: 1.45; text-transform: uppercase; }
  .registration-optional { margin-left: .35rem; color: #687065; font-size: .65rem; font-weight: 500; letter-spacing: .07em; }
  .registration-field input, .registration-field textarea { width: 100%; min-height: 50px; border: 1px solid #b8bdb5; border-radius: 3px; background: #fff; color: #1a1a1a; font: inherit; font-size: 1rem; padding: .8rem .9rem; transition: border-color 150ms ease, box-shadow 150ms ease; }
  .registration-field textarea { min-height: 6.5rem; resize: vertical; line-height: 1.55; }
  .registration-field input:focus, .registration-field textarea:focus { border-color: #3a7d32; box-shadow: 0 0 0 3px rgba(58,125,50,.16); outline: none; }
  .registration-field input[aria-invalid='true'], .registration-field textarea[aria-invalid='true'] { border-color: #a2392f; }
  .registration-help { margin: -.05rem 0 .15rem; color: #687065; font-size: .82rem; line-height: 1.55; }
  .registration-error { display: block; color: #8c2020; font-size: .82rem; font-weight: 550; line-height: 1.4; }
  .registration-choice-group { min-width: 0; margin: 0; padding: 0; border: 0; }
  .registration-choice-group > legend { margin-bottom: .65rem; }
  .registration-options { display: grid; gap: .65rem; }
  .registration-options--two-column { grid-template-columns: repeat(2,minmax(0,1fr)); }
  .registration-options--inline { display: flex; flex-wrap: wrap; }
  .registration-options--stacked { grid-template-columns: 1fr; }
  .registration-options--days { grid-template-columns: repeat(4,minmax(0,1fr)); }
  .registration-option { position: relative; display: flex; align-items: flex-start; gap: .7rem; min-height: 46px; margin: 0; padding: .7rem .8rem; border: 1px solid #d7dbd4; border-radius: 3px; background: #fbfcfa; color: #30372e; cursor: pointer; font-size: .92rem; font-weight: 450; letter-spacing: 0; line-height: 1.45; text-transform: none; transition: border-color 150ms ease, background 150ms ease; }
  .registration-option:hover { border-color: #99aa95; background: #f6f9f4; }
  .registration-option:has(input:checked) { border-color: #6c9567; background: #edf4ea; }
  .registration-option input { flex: 0 0 auto; width: 1.15rem; height: 1.15rem; margin: .08rem 0 0; accent-color: #3a7d32; }
  .registration-option input:focus-visible { outline: 3px solid rgba(58,125,50,.28); outline-offset: 3px; }
  .registration-option-detail { display: grid; grid-template-columns: minmax(0,1fr) minmax(13rem,.65fr); align-items: start; gap: 1rem; }
  .registration-conditional { margin-top: 1rem; padding: 1rem; border-left: 3px solid #77a270; background: #f6f9f4; }
  .registration-agreement, .registration-declaration { margin-top: 1.75rem; }
  .registration-agreement h3, .registration-privacy h3, .registration-declaration h3 { margin: 0 0 .65rem; color: #1f2a1f; font-size: 1.15rem; }
  .registration-agreement p, .registration-declaration > p { margin: 0 0 .75rem; color: #4e554b; line-height: 1.65; }
  .registration-agreement ul { margin: 0; padding-left: 1.25rem; color: #4e554b; line-height: 1.65; }
  .registration-privacy { margin-top: 1.75rem; padding: 1.25rem 1.4rem; border: 1px solid #d7e3d3; border-radius: 4px; background: #f1f6ef; }
  .registration-privacy p { margin: 0; color: #4e554b; font-size: .88rem; line-height: 1.65; }
  .registration-privacy p + p { margin-top: .5rem; }
  .registration-declaration .registration-field { margin-top: 1rem; }
  .registration-option--agreement { margin-top: 1rem; border-width: 2px; }
  .registration-option--agreement strong { color: #a2392f; }
  .registration-honeypot { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
  .registration-submit { display: grid; justify-items: center; gap: 1.2rem; padding-top: 2rem; text-align: center; }
  .registration-submit p { max-width: 38rem; margin: 0; color: #687065; font-size: .82rem; line-height: 1.55; }
  .registration-button { display: inline-flex; min-height: 54px; align-items: center; justify-content: center; border: 2px solid #1f2a1f; border-radius: 3px; background: #1f2a1f; color: #fff; cursor: pointer; font: inherit; font-size: .76rem; font-weight: 650; letter-spacing: .14em; padding: .9rem 1.5rem; text-decoration: none; text-transform: uppercase; transition: background 150ms ease, border-color 150ms ease, color 150ms ease, opacity 150ms ease; }
  .registration-button:hover:not(:disabled), .registration-button:focus-visible { border-color: #3a7d32; background: #3a7d32; }
  .registration-button:focus-visible { outline: 3px solid rgba(58,125,50,.25); outline-offset: 3px; }
  .registration-button:disabled { cursor: wait; opacity: .65; }
  .registration-button--secondary { background: transparent; color: #1f2a1f; }
  .registration-success { display: flex; min-height: 430px; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
  .registration-success__mark { display: grid; width: 66px; height: 66px; margin-bottom: 1.25rem; place-items: center; border-radius: 50%; background: #3a7d32; color: #fff; font-size: 2rem; font-weight: 650; }
  .registration-success h2 { margin: 0 0 .65rem; color: #1f2a1f; font-size: clamp(1.7rem,5vw,2.35rem); outline: none; }
  .registration-success > p { max-width: 34rem; margin: 0 0 1.75rem; color: #555d52; line-height: 1.65; }
  .registration-success__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .8rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  @media (max-width: 700px) {
    .registration-grid, .registration-options--two-column, .registration-options--days { grid-template-columns: 1fr; }
    .registration-option-detail { grid-template-columns: 1fr; gap: .65rem; }
    .registration-option-detail .registration-field { padding-left: 1rem; border-left: 2px solid #d7e3d3; }
    .registration-section { padding: 2rem 0; }
    .registration-section__heading { grid-template-columns: 2.25rem minmax(0,1fr); gap: .8rem; }
    .registration-section__heading > p { width: 2.25rem; height: 2.25rem; }
    .registration-options--inline { display: grid; grid-template-columns: 1fr 1fr; }
    .registration-success__actions { width: 100%; }
    .registration-success__actions .registration-button { width: 100%; }
  }
  @media (max-width: 390px) {
    .registration-options--inline { grid-template-columns: 1fr; }
    .registration-conditional, .registration-privacy, .registration-error-summary { padding: 1rem; }
  }
`;
