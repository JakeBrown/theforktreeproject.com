import { useEffect, useRef, useState, type FormEvent } from 'react';
import { getAdelaideDate, validateVolunteerSignIn } from '../lib/volunteerSignIn';

type FieldErrors = Record<string, string>;
type FormStatus = 'idle' | 'submitting' | 'success';

const emptyForm = () => ({
  fullName: '',
  email: '',
  phone: '',
  volunteerDate: getAdelaideDate(),
  communicationsConsent: false,
  website: '',
});

export default function VolunteerSignInForm() {
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const updateDate = () => {
      const today = getAdelaideDate();
      setFormData((current) =>
        current.volunteerDate === today ? current : { ...current, volunteerDate: today }
      );
    };

    const timer = window.setInterval(updateDate, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (status === 'success') successHeading.current?.focus();
  }, [status]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');

    const submission = { ...formData, volunteerDate: getAdelaideDate() };
    setFormData((current) => ({ ...current, volunteerDate: submission.volunteerDate }));

    const validation = validateVolunteerSignIn(submission, submission.volunteerDate);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setStatus('submitting');

    try {
      const response = await fetch('/api/volunteer-sign-in', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(submission),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        errors?: FieldErrors;
      };

      if (!response.ok || !result.ok) {
        setErrors(result.errors || {});
        setFormError(result.message || 'We couldn’t complete your sign-in. Please try again.');
        setStatus('idle');
        return;
      }

      setFormData(emptyForm());
      setStatus('success');
    } catch {
      setFormError('We couldn’t complete your sign-in. Please check the connection and try again.');
      setStatus('idle');
    }
  };

  const startAnotherSignIn = () => {
    setErrors({});
    setFormError('');
    setFormData(emptyForm());
    setStatus('idle');
  };

  return (
    <>
      {status === 'success' ? (
        <section className="sign-in-success" aria-live="polite">
          <div className="sign-in-success__mark" aria-hidden="true">✓</div>
          <h2 ref={successHeading} tabIndex={-1}>You’re signed in</h2>
          <p>Thank you for volunteering with The Forktree Project today.</p>
          <button type="button" className="sign-in-button" onClick={startAnotherSignIn}>
            Sign in another volunteer
          </button>
        </section>
      ) : (
        <form className="sign-in-form" onSubmit={handleSubmit} noValidate>
      <div className="sign-in-field">
        <label htmlFor="volunteer-full-name">Full name</label>
        <input
          id="volunteer-full-name"
          name="fullName"
          type="text"
          autoComplete="name"
          maxLength={120}
          value={formData.fullName}
          onChange={(event) => setFormData({ ...formData, fullName: event.target.value })}
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? 'volunteer-full-name-error' : undefined}
          required
        />
        {errors.fullName && <span id="volunteer-full-name-error" className="sign-in-error">{errors.fullName}</span>}
      </div>

      <div className="sign-in-field">
        <label htmlFor="volunteer-email">Email</label>
        <input
          id="volunteer-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={formData.email}
          onChange={(event) => setFormData({ ...formData, email: event.target.value })}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'volunteer-email-error' : undefined}
          required
        />
        {errors.email && <span id="volunteer-email-error" className="sign-in-error">{errors.email}</span>}
      </div>

      <div className="sign-in-field">
        <label htmlFor="volunteer-phone">Phone number</label>
        <input
          id="volunteer-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          value={formData.phone}
          onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
          aria-invalid={Boolean(errors.phone)}
          aria-describedby={errors.phone ? 'volunteer-phone-error' : undefined}
          required
        />
        {errors.phone && <span id="volunteer-phone-error" className="sign-in-error">{errors.phone}</span>}
      </div>

      <div className="sign-in-field">
        <label htmlFor="volunteer-date">Volunteer day</label>
        <input
          id="volunteer-date"
          name="volunteerDate"
          type="date"
          value={formData.volunteerDate}
          min={formData.volunteerDate}
          max={formData.volunteerDate}
          readOnly
          aria-readonly="true"
          aria-invalid={Boolean(errors.volunteerDate)}
          aria-describedby={errors.volunteerDate ? 'volunteer-date-error' : 'volunteer-date-help'}
          required
        />
        <span id="volunteer-date-help" className="sign-in-help">Today in South Australia</span>
        {errors.volunteerDate && <span id="volunteer-date-error" className="sign-in-error">{errors.volunteerDate}</span>}
      </div>

      <div className="sign-in-honeypot" aria-hidden="true">
        <label htmlFor="volunteer-website">Website</label>
        <input
          id="volunteer-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={(event) => setFormData({ ...formData, website: event.target.value })}
        />
      </div>

      <label className="sign-in-consent">
        <input
          name="communicationsConsent"
          type="checkbox"
          checked={formData.communicationsConsent}
          onChange={(event) =>
            setFormData({ ...formData, communicationsConsent: event.target.checked })
          }
        />
        <span>
          Yes, I’d like to receive occasional updates about volunteering at The Forktree Project.
          I can unsubscribe at any time.
        </span>
      </label>

      <p className="sign-in-privacy">
        We’ll use your details to manage today’s volunteer attendance and safety records. If you
        opt in above, we may also contact you about future volunteering opportunities.
      </p>

      {formError && <p className="sign-in-form-error" role="alert">{formError}</p>}

          <button type="submit" className="sign-in-button" disabled={status === 'submitting'}>
            {status === 'submitting' ? 'Signing you in…' : 'Sign in'}
          </button>
        </form>
      )}

      <style>{`
        .sign-in-form {
          display: grid;
          gap: 1.4rem;
        }

        .sign-in-field {
          display: grid;
          gap: 0.45rem;
        }

        .sign-in-field label {
          color: #1f2a1f;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .sign-in-field input {
          width: 100%;
          min-height: 52px;
          border: 1px solid #b8bdb5;
          border-radius: 2px;
          background: #fff;
          color: #1a1a1a;
          font: inherit;
          font-size: 1rem;
          padding: 0.8rem 0.9rem;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .sign-in-field input:focus {
          border-color: #3a7d32;
          box-shadow: 0 0 0 3px rgba(58, 125, 50, 0.16);
          outline: none;
        }

        .sign-in-field input[readonly] {
          background: #eef0eb;
          color: #41483e;
        }

        .sign-in-field input[aria-invalid='true'] {
          border-color: #a43232;
        }

        .sign-in-help {
          color: #687065;
          font-size: 0.78rem;
        }

        .sign-in-error {
          color: #8c2020;
          font-size: 0.82rem;
          font-weight: 500;
        }

        .sign-in-consent {
          display: grid;
          grid-template-columns: 24px 1fr;
          align-items: start;
          gap: 0.75rem;
          color: #343a32;
          cursor: pointer;
          font-size: 0.9rem;
          line-height: 1.55;
        }

        .sign-in-consent input {
          width: 20px;
          height: 20px;
          margin-top: 0.15rem;
          accent-color: #3a7d32;
        }

        .sign-in-privacy {
          margin: -0.25rem 0 0;
          color: #687065;
          font-size: 0.78rem;
          line-height: 1.6;
        }

        .sign-in-form-error {
          margin: 0;
          border-radius: 2px;
          background: #f9e9e7;
          color: #79231e;
          padding: 0.9rem 1rem;
          font-size: 0.9rem;
        }

        .sign-in-button {
          width: 100%;
          min-height: 54px;
          border: 2px solid #1f2a1f;
          background: #1f2a1f;
          color: #fff;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          padding: 0.9rem 1.5rem;
          text-transform: uppercase;
          transition: background 150ms ease, color 150ms ease, opacity 150ms ease;
        }

        .sign-in-button:hover:not(:disabled),
        .sign-in-button:focus-visible {
          background: #3a7d32;
          border-color: #3a7d32;
        }

        .sign-in-button:focus-visible {
          outline: 3px solid rgba(58, 125, 50, 0.25);
          outline-offset: 3px;
        }

        .sign-in-button:disabled {
          cursor: wait;
          opacity: 0.65;
        }

        .sign-in-honeypot {
          position: absolute;
          left: -10000px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }

        .sign-in-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 390px;
          justify-content: center;
          text-align: center;
        }

        .sign-in-success__mark {
          display: grid;
          width: 64px;
          height: 64px;
          margin-bottom: 1.25rem;
          place-items: center;
          border-radius: 50%;
          background: #3a7d32;
          color: #fff;
          font-size: 2rem;
          font-weight: 600;
        }

        .sign-in-success h2 {
          margin-bottom: 0.65rem;
          color: #1f2a1f;
          font-size: clamp(1.6rem, 5vw, 2.2rem);
          outline: none;
        }

        .sign-in-success p {
          margin-bottom: 1.75rem;
          color: #555d52;
        }
      `}</style>
    </>
  );
}
