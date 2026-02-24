import { useState, type FormEvent } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required.';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.message.trim()) newErrors.message = 'Message is required.';
    return newErrors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    setStatus('submitting');

    // TODO: Replace with actual form backend (Formspree, Netlify Forms, etc.)
    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus('success');
      setFormData({ firstName: '', lastName: '', email: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="contact-form__success">
        <p>Thank you for your message! We'll be in touch soon.</p>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit} noValidate>
      <div className="contact-form__row">
        <div className="contact-form__field">
          <label htmlFor="firstName">First Name *</label>
          <input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
          {errors.firstName && <span className="contact-form__error">{errors.firstName}</span>}
        </div>
        <div className="contact-form__field">
          <label htmlFor="lastName">Last Name *</label>
          <input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
          {errors.lastName && <span className="contact-form__error">{errors.lastName}</span>}
        </div>
      </div>

      <div className="contact-form__field">
        <label htmlFor="email">Email Address *</label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        {errors.email && <span className="contact-form__error">{errors.email}</span>}
      </div>

      <div className="contact-form__field">
        <label htmlFor="subject">Subject</label>
        <input
          type="text"
          id="subject"
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        />
      </div>

      <div className="contact-form__field">
        <label htmlFor="message">Message *</label>
        <textarea
          id="message"
          rows={6}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
        {errors.message && <span className="contact-form__error">{errors.message}</span>}
      </div>

      {status === 'error' && (
        <p className="contact-form__error">Something went wrong. Please try again later.</p>
      )}

      <button
        type="submit"
        className="contact-form__submit"
        disabled={status === 'submitting'}
      >
        {status === 'submitting' ? 'Sending...' : 'Submit'}
      </button>

      <style>{`
        .contact-form {
          max-width: 600px;
          margin: 0 auto;
        }

        .contact-form__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 480px) {
          .contact-form__row {
            grid-template-columns: 1fr;
          }
        }

        .contact-form__field {
          margin-bottom: 1.25rem;
        }

        .contact-form__field label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
          color: #555;
        }

        .contact-form__field input,
        .contact-form__field textarea {
          width: 100%;
          padding: 0.75rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 1rem;
          border: 1px solid #ddd;
          background: #fff;
          color: #1a1a1a;
          transition: border-color 0.2s ease;
        }

        .contact-form__field input:focus,
        .contact-form__field textarea:focus {
          outline: none;
          border-color: #3a7d32;
        }

        .contact-form__field textarea {
          resize: vertical;
          min-height: 120px;
        }

        .contact-form__error {
          display: block;
          color: #c0392b;
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        .contact-form__submit {
          display: inline-block;
          padding: 0.75rem 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: transparent;
          color: #1a1a1a;
          border: 2px solid #1a1a1a;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .contact-form__submit:hover {
          background: #1a1a1a;
          color: #fff;
        }

        .contact-form__submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .contact-form__success {
          text-align: center;
          padding: 2rem;
          font-size: 1.1rem;
          color: #3a7d32;
        }
      `}</style>
    </form>
  );
}
