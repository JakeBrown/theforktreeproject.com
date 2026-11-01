import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SIGN_IN_DECLARATION_TEXT } from '../lib/volunteerAttendance';
import { getAdelaideDate, validateVolunteerSignIn, validateVolunteerSignOut } from '../lib/volunteerSignIn';

type FieldErrors = Record<string, string>;
type FormStatus = 'idle' | 'submitting' | 'success';
type Mode = 'sign-in' | 'sign-out';

const emptyForm = () => ({
  fullName: '',
  phone: '',
  declarationAccepted: false,
  website: '',
});

export default function VolunteerSignInForm() {
  const [mode, setMode] = useState<Mode>('sign-in');
  const [formData, setFormData] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [signedOutName, setSignedOutName] = useState('');
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status === 'success') successHeading.current?.focus();
  }, [status]);

  useEffect(() => {
    // The QR poster can link straight to sign-out with ?mode=sign-out.
    const requested = new URLSearchParams(window.location.search).get('mode');
    if (requested === 'sign-out') setMode('sign-out');
  }, []);

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
    setFormError('');
    setErrorCode('');
    setStatus('idle');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setErrorCode('');

    const isSignIn = mode === 'sign-in';
    const submission = isSignIn
      ? { ...formData, volunteerDate: getAdelaideDate() }
      : { phone: formData.phone, website: formData.website };

    const validation = isSignIn
      ? validateVolunteerSignIn(submission, getAdelaideDate())
      : validateVolunteerSignOut(submission);
    if (!validation.success) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setStatus('submitting');

    try {
      const response = await fetch(isSignIn ? '/api/volunteer-sign-in' : '/api/volunteer-sign-out', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(submission),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        code?: string;
        name?: string;
        message?: string;
        errors?: FieldErrors;
      };

      if (!response.ok || !result.ok) {
        setErrors(result.errors || {});
        setErrorCode(result.code || '');
        setFormError(
          result.message ||
            (isSignIn ? 'We couldn’t complete your sign-in. Please try again.' : 'We couldn’t complete your sign-out. Please try again.')
        );
        setStatus('idle');
        return;
      }

      setSignedOutName(result.name || '');
      setFormData(emptyForm());
      setStatus('success');
    } catch {
      setFormError('We couldn’t reach Forktree. Please check the connection and try again.');
      setStatus('idle');
    }
  };

  const startAgain = () => {
    setErrors({});
    setFormError('');
    setErrorCode('');
    setFormData(emptyForm());
    setStatus('idle');
  };

  const isSignIn = mode === 'sign-in';

  return (
    <>
      <div className="sign-in-mode" role="group" aria-label="Arriving or leaving">
        <button type="button" aria-pressed={isSignIn} onClick={() => switchMode('sign-in')}>
          Arriving — sign in
        </button>
        <button type="button" aria-pressed={!isSignIn} onClick={() => switchMode('sign-out')}>
          Leaving — sign out
        </button>
      </div>

      {status === 'success' ? (
        <section className="sign-in-success" aria-live="polite">
          <div className="sign-in-success__mark" aria-hidden="true">✓</div>
          {isSignIn ? (
            <>
              <h2 ref={successHeading} tabIndex={-1}>You’re signed in</h2>
              <p>Thank you for volunteering with The Forktree Project today. Scan the same QR code to sign out when you leave.</p>
              <button type="button" className="sign-in-button" onClick={startAgain}>
                Sign in another volunteer
              </button>
            </>
          ) : (
            <>
              <h2 ref={successHeading} tabIndex={-1}>
                {signedOutName ? `Thanks, ${signedOutName}. You’re signed out` : 'You’re signed out'}
              </h2>
              <p>Thank you for volunteering with The Forktree Project today. Travel home safely.</p>
              <button type="button" className="sign-in-button" onClick={startAgain}>
                Sign out another volunteer
              </button>
            </>
          )}
        </section>
      ) : (
        <form className="sign-in-form" onSubmit={handleSubmit} noValidate>
          {isSignIn && (
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
              {errors.fullName && (
                <span id="volunteer-full-name-error" className="sign-in-error">
                  {errors.fullName}
                </span>
              )}
            </div>
          )}

          <div className="sign-in-field">
            <label htmlFor="volunteer-phone">{isSignIn ? 'Phone number' : 'Phone number you signed in with'}</label>
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
            {errors.phone && (
              <span id="volunteer-phone-error" className="sign-in-error">
                {errors.phone}
              </span>
            )}
          </div>

          {isSignIn && (
            <div className="sign-in-declaration">
              <p className="sign-in-declaration__heading" id="volunteer-declaration-heading">Declaration</p>
              <label className="sign-in-declaration__label" htmlFor="volunteer-declaration">
                <input
                  id="volunteer-declaration"
                  name="declarationAccepted"
                  type="checkbox"
                  checked={formData.declarationAccepted}
                  onChange={(event) => setFormData({ ...formData, declarationAccepted: event.target.checked })}
                  aria-invalid={Boolean(errors.declarationAccepted)}
                  aria-describedby={errors.declarationAccepted ? 'volunteer-declaration-error' : undefined}
                  required
                />
                <span>“{SIGN_IN_DECLARATION_TEXT}”</span>
              </label>
              {errors.declarationAccepted && (
                <span id="volunteer-declaration-error" className="sign-in-error">
                  {errors.declarationAccepted}
                </span>
              )}
            </div>
          )}

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

          {isSignIn && (
            <p className="sign-in-privacy">
              We’ll use your name and phone number to manage today’s volunteer attendance and safety
              records.
            </p>
          )}

          {formError && (
            <div className="sign-in-form-error" role="alert">
              <p>{formError}</p>
              {errorCode === 'duplicate' && (
                <button type="button" className="sign-in-inline-button" onClick={() => switchMode('sign-out')}>
                  Sign out instead
                </button>
              )}
              {errorCode === 'not-signed-in' && (
                <button type="button" className="sign-in-inline-button" onClick={() => switchMode('sign-in')}>
                  Sign in instead
                </button>
              )}
            </div>
          )}

          <button type="submit" className="sign-in-button" disabled={status === 'submitting'}>
            {status === 'submitting'
              ? isSignIn ? 'Signing you in…' : 'Signing you out…'
              : isSignIn ? 'Sign in' : 'Sign out'}
          </button>
        </form>
      )}

      <style>{`
        .sign-in-mode {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.35rem;
          margin-bottom: 1.6rem;
          padding: 0.3rem;
          border: 1px solid #d3dbd0;
          border-radius: 4px;
          background: #f3f6f1;
        }

        .sign-in-mode button {
          min-height: 48px;
          border-radius: 2px;
          color: #4c5849;
          font-size: 0.74rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          padding: 0.6rem 0.5rem;
          text-transform: uppercase;
        }

        .sign-in-mode button[aria-pressed='true'] {
          background: #1f2a1f;
          color: #fff;
        }

        .sign-in-mode button:focus-visible {
          outline: 3px solid rgba(58, 125, 50, 0.25);
          outline-offset: 2px;
        }

        .sign-in-declaration {
          display: grid;
          gap: 0.55rem;
          padding: 1rem;
          border: 1px solid #d8ded5;
          border-radius: 2px;
          background: #f7f9f6;
        }

        .sign-in-declaration__heading {
          margin: 0;
          color: #1f2a1f;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .sign-in-declaration__label {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 0.75rem;
          align-items: start;
          color: #2f382d;
          font-size: 0.92rem;
          line-height: 1.55;
          cursor: pointer;
        }

        .sign-in-declaration__label input {
          width: 22px;
          height: 22px;
          margin-top: 0.15rem;
          accent-color: #3a7d32;
        }

        .sign-in-form-error p {
          margin: 0;
        }

        .sign-in-inline-button {
          margin-top: 0.6rem;
          color: #1f2a1f;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-decoration: underline;
          text-underline-offset: 0.2em;
          text-transform: uppercase;
        }

        @media (max-width: 420px) {
          .sign-in-mode { grid-template-columns: 1fr; }
        }

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

        .sign-in-field input[aria-invalid='true'] {
          border-color: #a43232;
        }

        .sign-in-error {
          color: #8c2020;
          font-size: 0.82rem;
          font-weight: 500;
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
